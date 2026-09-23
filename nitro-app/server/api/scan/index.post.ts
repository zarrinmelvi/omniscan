import { defineEventHandler, readMultipartFormData, createError, setResponseStatus } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { OLLAMA_ENDPOINT, SCAN_VISION_MODEL } from '../../lib/ollama-models'
import { findMatchedUserAllergens, matchUserAllergensSemantically, mergeMatchedAllergens } from '../../lib/allergen-matching'
import { stripCodeFences } from '../../lib/ai-json'
import { matchCatalogProduct, CATALOG_PRODUCT_SELECT } from '../../lib/catalog-matching'
import { determineDisallowedCatalogIngredients } from '../../lib/alternative-reasoning'
import { findAlternativeProducts } from '../../lib/alternative-matching'
import { MONTH_NAMES, isValidYMD, tryParseRawDateString, normalizeToDateStringOrNull } from '../../lib/date-parse'
type SafetyVerdict = 'Red' | 'Yellow' | 'Green'

interface OllamaChatMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
	images?: string[]
}

interface OllamaChatRequestBody {
	model: string
	stream: false
	format: 'json'
	messages: OllamaChatMessage[]
}

interface OllamaChatResponse {
	model: string
	created_at: string
	message: {
		role: string
		content: string
	}
	done: boolean
}

interface ScanAiExtraction {
	is_food_product: boolean
	product_name: string
	brand: string
	ingredients_text: string
	simplified_ingredients: string
	halal_logo_detected: boolean
	certifying_body: string
	// AI-read expiration/best-before/use-by date, normalized to YYYY-MM-DD,
	// or null if none was visible/legible. Validated server-side in
	// normalizeToDateStringOrNull — never trust the model's own format
	// compliance for something that feeds an <input type="date">.
	expiration_date: string | null
	// Net quantity as a number (e.g. 500, 1, 250) or null if not found
	net_quantity: number | null
	// Unit string as printed (e.g. "ml", "g", "L", "kg", "oz") or null if not found
	net_unit: string | null
}

interface HalalLogoRecord {
	id: number
	certifier: string
	is_accredited: boolean
}

const RED_KEYWORDS = ['milk', 'wheat', 'soy']
const YELLOW_KEYWORDS = ['sugar', 'salt']

function buildPrompt(): string {
	return [
		'You are a food-label OCR and ingredient-extraction assistant.',
		'First, determine whether the attached photo(s) show FOOD OR BEVERAGE packaging',
		'(something meant to be eaten or drunk) as opposed to a non-food product such as',
		'cosmetics, toiletries, cleaning supplies, electronics, clothing, footwear, or any',
		'other non-edible item.',
		"You will be given either one or two photos of the SAME product's packaging.",
		'If two images are attached, the first is the FRONT of the package (branding, product name)',
		'and the second is the BACK of the package (ingredients list, nutrition facts, and any',
		'certification marks) — treat them as one combined source of truth about this single product,',
		'not as two different products. If only one image is attached, extract everything visible in',
		'that single image.',
		'Respond with ONLY a single JSON object, no prose, no markdown code fences,',
		'matching exactly this shape:',
		'{"is_food_product": boolean, "product_name": string, "brand": string, "ingredients_text": string,',
		'"simplified_ingredients": string, "halal_logo_detected": boolean, "certifying_body": string,',
		'"expiration_date": string | null, "net_quantity": number | null, "net_unit": string | null}.',
		'"is_food_product" must be false for anything that is not meant for human consumption',
		'(e.g. lotion, shampoo, shoes, electronics, toys, stationery) — when false, you may leave the',
		'other string fields as empty strings, halal_logo_detected as false, and expiration_date as null,',
		'since ingredient extraction does not apply to a non-food item.',
		'When is_food_product is true, extract the remaining fields as follows:',
		'"ingredients_text" should be the raw ingredient list as printed on the label.',
		'"simplified_ingredients" should restate that list in plain, easy-to-understand language',
		'for someone checking for allergens, without adding health claims.',
		'"halal_logo_detected" should be true only if you can see an actual Halal certification mark on the',
		'packaging — typically a circular or shield-shaped logo, often containing the word "HALAL" in Latin',
		"or Arabic script, sometimes alongside a certifying body's name or initials (e.g. JAKIM, MUIS, ESMA,",
		'IFANCA). Do not infer Halal status from ingredients alone — this field is strictly about a visible logo/mark.',
		'"certifying_body" should be the name or initials of the certifying body as printed near/on the logo,',
		'exactly as it appears, or an empty string if no logo was detected or the certifying body text is not legible.',
		'"expiration_date" should be any printed expiration date, best-before date, or use-by date visible on the',
		'packaging — look for text labeled "EXP", "Expiry", "Best Before", "BB", "Use By", or similar, in any',
		'position on the label. Convert whatever format is printed (e.g. "31 DEC 2026", "12/31/2026", "2026.12.31")',
		'into strict ISO format YYYY-MM-DD. If the printed date is ambiguous, partially obscured, or you are not',
		'confident you have read it correctly, return null rather than guessing — a wrong date is worse than no date.',
		'If no date is visible on the packaging at all, return null.',
		'If a field cannot be read from the image, use an empty string (or false for the boolean field, or null for expiration_date).',
		'"net_quantity" should be the numeric net quantity printed on the label (e.g. 500 for "500ml", 1 for "1L", 250 for "250g"). Return only the number, not the unit. If no net quantity is visible, return null.',
		'"net_unit" should be the unit of measure as printed (e.g. "ml", "L", "g", "kg", "oz", "fl oz", "pcs", "pack"). Return only the unit string, lowercase. If no unit is visible or net_quantity is null, return null.',
		'Do not invent ingredients, certifications, product identity, or a date that are not visibly present.',
	].join(' ')
}

function normalizeToBoolean(value: unknown): boolean {
	return value === true
}

function normalizeToString(value: unknown): string {
	if (typeof value === 'string') return value
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === 'string').join(', ')
	}
	return ''
}


function coerceAiExtraction(value: unknown): ScanAiExtraction | null {
	if (!value || typeof value !== 'object') return null
	const candidate = value as Record<string, unknown>

	return {
		is_food_product: normalizeToBoolean(candidate.is_food_product),
		product_name: normalizeToString(candidate.product_name),
		brand: normalizeToString(candidate.brand),
		ingredients_text: normalizeToString(candidate.ingredients_text),
		simplified_ingredients: normalizeToString(candidate.simplified_ingredients),
		halal_logo_detected: normalizeToBoolean(candidate.halal_logo_detected),
		certifying_body: normalizeToString(candidate.certifying_body),
		expiration_date: normalizeToDateStringOrNull(candidate.expiration_date),
		net_quantity: typeof candidate.net_quantity === 'number' ? candidate.net_quantity : null,
		net_unit: typeof candidate.net_unit === 'string' && candidate.net_unit.trim() ? candidate.net_unit.trim().toLowerCase() : null,
	}
}

async function extractProductInfoFromImage(base64Images: string[]): Promise<ScanAiExtraction> {
	const requestPayload: OllamaChatRequestBody = {
		model: SCAN_VISION_MODEL,
		stream: false,
		format: 'json',
		messages: [
			{
				role: 'user',
				content: buildPrompt(),
				images: base64Images,
			},
		],
	}

	console.log('Images sent to gemma4:cloud:', requestPayload.messages[0].images?.length ?? 0)

	let ollamaResponse: OllamaChatResponse

	try {
		ollamaResponse = await $fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
			},
			body: requestPayload,
		})

		console.log('==========================================')
		console.log('RAW OLLAMA RESPONSE:', JSON.stringify(ollamaResponse))
		console.log('==========================================')
	} catch (err) {
		throw createError({
			statusCode: 502,
			statusMessage:
				'Could not reach the Ollama Cloud model via the local Ollama instance at :11434. Is `ollama serve` running and are you signed in (`ollama signin`) with access to "gemma4:cloud"?',
			cause: err,
		})
	}

	const rawContent = ollamaResponse?.message?.content

	if (!rawContent) {
		throw createError({
			statusCode: 502,
			statusMessage: 'Ollama returned an empty response.',
		})
	}

	let parsed: unknown

	try {
		parsed = JSON.parse(stripCodeFences(rawContent))
	} catch (err) {
		throw createError({
			statusCode: 502,
			statusMessage: 'Model response was not valid JSON.',
			cause: err,
		})
	}

	const extraction = coerceAiExtraction(parsed)

	if (!extraction) {
		throw createError({
			statusCode: 502,
			statusMessage: 'Model response did not match the expected extraction shape.',
		})
	}

	return extraction
}

function determineVerdict(text: string): { verdict: SafetyVerdict; reasons: string[] } {
	const normalized = text.toLowerCase()

	const matchedRed = RED_KEYWORDS.filter((k) => normalized.includes(k))
	if (matchedRed.length > 0) {
		return { verdict: 'Red', reasons: matchedRed.map((k) => `Contains ${k}`) }
	}

	const matchedYellow = YELLOW_KEYWORDS.filter((k) => normalized.includes(k))
	if (matchedYellow.length > 0) {
		return { verdict: 'Yellow', reasons: matchedYellow.map((k) => `Contains ${k}`) }
	}

	return { verdict: 'Green', reasons: ['No flagged ingredients detected'] }
}

// The AI reads one photo, so certifying_body is usually a single name — but
// occasionally a label genuinely shows more than one certifying mark, and
// gemma4:cloud may read that as a comma-separated string (e.g.
// "IDCP, MUI, JAKIM"). Split and resolve each candidate independently rather
// than treating the whole string as one (likely unmatchable) name, and
// return every match found, deduped by id.
function resolveHalalLogoMatches(certifyingBodyText: string, logos: HalalLogoRecord[]): HalalLogoRecord[] {
	const candidates = certifyingBodyText
		.split(',')
		.map((c) => c.trim().toLowerCase())
		.filter(Boolean)

	if (candidates.length === 0) return []

	const matches = new Map<number, HalalLogoRecord>()

	for (const candidate of candidates) {
		const found = logos.find((logo) => {
			const known = logo.certifier.trim().toLowerCase()
			if (!known) return false
			return known.includes(candidate) || candidate.includes(known)
		})
		if (found) matches.set(found.id, found)
	}

	return Array.from(matches.values())
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const form = await readMultipartFormData(event)

	if (!form) {
		throw createError({ statusCode: 400, statusMessage: 'Missing form data.' })
	}

	const imageField = form.find((f) => f.name === 'image')

	if (!imageField || !imageField.filename) {
		throw createError({ statusCode: 400, statusMessage: 'Missing image file.' })
	}

	const base64Raw = imageField.data.toString('base64')
	const mimeType = imageField.type || 'image/jpeg'
	const imageDataUri = `data:${mimeType};base64,${base64Raw}`

	const imageBackField = form.find((f) => f.name === 'image_back')
	const hasBackImage = Boolean(imageBackField?.filename)

	const base64RawBack = hasBackImage ? imageBackField!.data.toString('base64') : null
	const imageDataUriBack = hasBackImage ? `data:${imageBackField!.type || 'image/jpeg'};base64,${base64RawBack}` : null

	const mockTextField = form.find((f) => f.name === 'mock_ingredients')

	let extraction: ScanAiExtraction

	if (mockTextField?.data) {
		const mockText = mockTextField.data.toString('utf-8')
		extraction = {
			is_food_product: true,
			product_name: imageField.filename,
			brand: 'Scanned Product',
			ingredients_text: mockText,
			simplified_ingredients: mockText,
			halal_logo_detected: false,
			certifying_body: '',
			expiration_date: null,
			net_quantity: null,
			net_unit: null,
		}
	} else {
		const imagesForAi = base64RawBack ? [base64Raw, base64RawBack] : [base64Raw]
		extraction = await extractProductInfoFromImage(imagesForAi)
	}

	if (!extraction.is_food_product) {
		throw createError({
			statusCode: 422,
			statusMessage:
				"This doesn't look like a food or beverage product. OmniScan only tracks food items — try scanning the packaging of something edible or drinkable.",
		})
	}
	const [userWithAllergens, halalLogos, catalogProducts] = await Promise.all([
		prisma.user.findUnique({
			where: { id: authUser.id },
			select: {
				allergens: {
					select: {
						id: true,
						name: true,
						scientific_name: true,
						ingredient_mapping: { select: { scientific_term: true, simplified_term: true } },
					},
				},
				dietary_prof: { select: { halal_pref: true, custom_preferences: true }, orderBy: { updated_at: 'desc' }, take: 1 },
			},
		}),
		prisma.halalLogo.findMany({
			select: { id: true, certifier: true, is_accredited: true },
		}),
		prisma.catalogProduct.findMany({
			where: { is_verified: true },
			select: CATALOG_PRODUCT_SELECT,
		}),
	])

	const catalogMatch = matchCatalogProduct({ brand: extraction.brand, product_name: extraction.product_name }, catalogProducts)

	if (catalogMatch && !extraction.ingredients_text.trim() && !extraction.simplified_ingredients.trim()) {
		extraction.ingredients_text = catalogMatch.ingredient_text
		extraction.simplified_ingredients = catalogMatch.simplified_ingredients
	}

	let { verdict, reasons } = determineVerdict(extraction.ingredients_text)

	// AI-detection-first, catalog-fallback-second — deliberately kept this
	// precedence (not flipped to catalog-first) per an earlier explicit
	// decision: with most CatalogProduct rows still lacking real Halal data,
	// flipping it would have little practical effect yet and isn't worth
	// revisiting until more catalog rows actually carry certifications.
	const aiMatchedHalalLogos = extraction.halal_logo_detected ? resolveHalalLogoMatches(extraction.certifying_body, halalLogos) : []

	const catalogHalalLogos = catalogMatch?.halal_logos.map((link) => link.halal_logo) ?? []

	const matchedHalalLogos = aiMatchedHalalLogos.length > 0 ? aiMatchedHalalLogos : catalogHalalLogos

	// Kept for anything still reading a single logo (e.g. the legacy
	// halal_logo_id column) — first match is an arbitrary but stable choice
	// when there's more than one.
	const matchedHalalLogo = matchedHalalLogos[0] ?? null

	const combinedIngredientText = `${extraction.ingredients_text} ${extraction.simplified_ingredients}`

	const stringMatches = findMatchedUserAllergens(combinedIngredientText, userWithAllergens?.allergens ?? [])

	const semanticMatches = mockTextField?.data
		? []
		: await matchUserAllergensSemantically(combinedIngredientText, userWithAllergens?.allergens ?? [])

	const matchedUserAllergens = mergeMatchedAllergens(stringMatches, semanticMatches)

	if (matchedUserAllergens.length > 0) {
		verdict = 'Red'
		reasons = [
			...reasons.filter((r) => r !== 'No flagged ingredients detected'),
			...matchedUserAllergens.map((a) =>
				a.confidence >= 1
					? `Contains ${a.name} — your allergen`
					: `Possibly contains ${a.name} — your allergen (AI-inferred${a.matched_term ? ` from "${a.matched_term}"` : ''}, ${Math.round(a.confidence * 100)}% confidence)`,
			),
		]
	}

	try {
		const product = await prisma.product.create({
			data: {
				brand_name: extraction.brand || 'Unknown',
				product_name: extraction.product_name || imageField.filename,
				ingredient_text: extraction.ingredients_text,
				simplified_ingredients: extraction.simplified_ingredients,
				image_base64: imageDataUri,
				image_base64_back: imageDataUriBack ?? undefined,
				is_verified: false,

				...(matchedHalalLogo ? { halal_logo_id: matchedHalalLogo.id } : {}),
				halal_unverified: extraction.halal_logo_detected && matchedHalalLogos.length === 0,
			},
		})

		if (matchedHalalLogos.length > 0) {
			await prisma.productHalalLogo.createMany({
				data: matchedHalalLogos.map((logo) => ({ product_id: product.id, halal_logo_id: logo.id })),
				skipDuplicates: true,
			})
		}

		const scan = await prisma.scan.create({
			data: {
				image_url: `uploads/${imageField.filename}`,
				image_url_back: hasBackImage ? `uploads/${imageBackField!.filename}` : undefined,
				scan_time: new Date(),

				ai_confidence_score:
					matchedUserAllergens.length > 0 ? Math.min(...matchedUserAllergens.map((a) => a.confidence)) : mockTextField?.data ? 0.75 : 0.9,
				safety_verdict: verdict,
				flag_reason: reasons.join(', '),
				user_id: authUser.id,
				product_id: product.id,
			},
		})

		await prisma.activityLog.create({
			data: {
				type: 'scanned',
				message: product.product_name,
				user_id: authUser.id,
				product_id: product.id,
			},
		})

		const halalUnverified = extraction.halal_logo_detected && matchedHalalLogos.length === 0
		const shouldAutoFlag = verdict === 'Red' || halalUnverified

		if (shouldAutoFlag) {
			const flagReasonParts: string[] = []

			if (verdict === 'Red') {
				flagReasonParts.push(`Red safety verdict: ${reasons.join(', ')}`)
			}
			if (halalUnverified) {
				flagReasonParts.push(
					`Halal logo detected on packaging but not matched to a known certifying body${
						extraction.certifying_body ? ` (read as "${extraction.certifying_body}")` : ''
					} — needs manual verification.`,
				)
			}

			await prisma.flaggedScan
				.create({
					data: {
						flag_reason: flagReasonParts.join(' | '),
						scan_id: scan.id,
					},
				})
				.catch((err) => {
					console.error('Failed to create FlaggedScan record:', err)
				})
		}

		setResponseStatus(event, 201)

		const halalPref = userWithAllergens?.dietary_prof?.[0]?.halal_pref ?? false

		let alternatives: Awaited<ReturnType<typeof findAlternativeProducts>> = []
		let alternativesMessage: string | null = null

		if (catalogMatch?.variant_group) {
			const dietaryProfile = {
				allergens: userWithAllergens?.allergens ?? [],
				halalPref,
				customPreferences: userWithAllergens?.dietary_prof?.[0]?.custom_preferences ?? [],
			}

			const { disallowedIngredientNames } = await determineDisallowedCatalogIngredients(dietaryProfile)

			alternatives = await findAlternativeProducts(disallowedIngredientNames, {
				variantGroup: catalogMatch.variant_group,
				excludeProductId: catalogMatch.id,
				requireHalalCertified: halalPref,
			})

			if (alternatives.length === 0) {
				alternativesMessage = 'No verified allergen-free alternatives found for this product group.'
			}
		} else {
			alternativesMessage = 'No known alternatives for this product yet.'
		}

		return {
			success: true,
			scan: {
				product: {
					id: product.id,
					brand_name: product.brand_name,
					product_name: product.product_name,
					ingredient_text: product.ingredient_text,
					simplified_ingredients: product.simplified_ingredients,
					halal_logo_id: product.halal_logo_id,
					halal_unverified: product.halal_unverified,
					image_base64: product.image_base64,
					image_base64_back: product.image_base64_back,
					expiration_date_detected: extraction.expiration_date,
					net_quantity_detected: extraction.net_quantity,
					net_unit_detected: extraction.net_unit,
				},
				safety_verdict: scan.safety_verdict,
				flag_reason: scan.flag_reason,
				matched_user_allergens: matchedUserAllergens.map((a) => a.name),
				halal: {
					logo_detected: extraction.halal_logo_detected,
					certifying_body: extraction.certifying_body || null,
					known_certifier: matchedHalalLogo?.certifier ?? null,
					is_accredited: matchedHalalLogo?.is_accredited ?? null,
					matched_known_logo: matchedHalalLogos.length > 0,
					// Full set — a product can genuinely hold more than one
					// real certification (e.g. from the catalog fallback).
					// known_certifier above is kept for anything still reading
					// a single value.
					certifiers: matchedHalalLogos.map((logo) => ({ id: logo.id, certifier: logo.certifier, is_accredited: logo.is_accredited })),
				},
				scan_time: scan.scan_time,
				alternatives,
				alternatives_message: alternativesMessage,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to save scan:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to save scan.' })
	}
})
