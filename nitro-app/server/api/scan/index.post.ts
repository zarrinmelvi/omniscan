import { defineEventHandler, readMultipartFormData, createError, setResponseStatus } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { OLLAMA_ENDPOINT, SCAN_VISION_MODEL } from '../../lib/ollama-models'
import { findMatchedUserAllergens, matchUserAllergensSemantically, mergeMatchedAllergens } from '../../lib/allergen-matching'
import { stripCodeFences } from '../../lib/ai-json'

// ---------- Types ----------

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
	product_name: string
	brand: string
	ingredients_text: string
	simplified_ingredients: string
	halal_logo_detected: boolean
	certifying_body: string
}

interface HalalLogoRecord {
	id: number
	certifying_body: string
	is_accredited: boolean
}

// ---------- Config ----------

// OLLAMA_ENDPOINT and SCAN_VISION_MODEL now come from ../../lib/ollama-models
// so every AI call site in the app stays in sync on model tags.

const RED_KEYWORDS = ['milk', 'wheat', 'soy']
const YELLOW_KEYWORDS = ['sugar', 'salt']

// ---------- Helpers ----------

function buildPrompt(): string {
	return [
		'You are a food-label OCR and ingredient-extraction assistant.',
		"You will be given either one or two photos of the SAME product's packaging.",
		'If two images are attached, the first is the FRONT of the package (branding, product name)',
		'and the second is the BACK of the package (ingredients list, nutrition facts, and any',
		'certification marks) — treat them as one combined source of truth about this single product,',
		'not as two different products. If only one image is attached, extract everything visible in',
		'that single image.',
		'Look at the attached product packaging photo(s) and extract the following fields.',
		'Respond with ONLY a single JSON object, no prose, no markdown code fences,',
		'matching exactly this shape:',
		'{"product_name": string, "brand": string, "ingredients_text": string, "simplified_ingredients": string,',
		'"halal_logo_detected": boolean, "certifying_body": string}.',
		'"ingredients_text" should be the raw ingredient list as printed on the label.',
		'"simplified_ingredients" should restate that list in plain, easy-to-understand language',
		'for someone checking for allergens, without adding health claims.',
		'"halal_logo_detected" should be true only if you can see an actual Halal certification mark on the',
		'packaging — typically a circular or shield-shaped logo, often containing the word "HALAL" in Latin',
		"or Arabic script, sometimes alongside a certifying body's name or initials (e.g. JAKIM, MUIS, ESMA,",
		'IFANCA). Do not infer Halal status from ingredients alone — this field is strictly about a visible logo/mark.',
		'"certifying_body" should be the name or initials of the certifying body as printed near/on the logo,',
		'exactly as it appears, or an empty string if no logo was detected or the certifying body text is not legible.',
		'If a field cannot be read from the image, use an empty string (or false for the boolean field).',
		'Do not invent ingredients or certifications that are not visibly printed on the packaging.',
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

// minicpm-v has been observed returning ingredients_text/simplified_ingredients
// as either a single string or an array of strings across different scans.
// Rather than hard-failing on the array shape, normalize both cases into the
// flat string shape the rest of the app expects.
function coerceAiExtraction(value: unknown): ScanAiExtraction | null {
	if (!value || typeof value !== 'object') return null
	const candidate = value as Record<string, unknown>

	return {
		product_name: normalizeToString(candidate.product_name),
		brand: normalizeToString(candidate.brand),
		ingredients_text: normalizeToString(candidate.ingredients_text),
		simplified_ingredients: normalizeToString(candidate.simplified_ingredients),
		halal_logo_detected: normalizeToBoolean(candidate.halal_logo_detected),
		certifying_body: normalizeToString(candidate.certifying_body),
	}
}

// Accepts 1 or 2 base64-encoded images (front only, or [front, back]) and
// sends them to gemma4:cloud in a single chat message — gemma4:cloud accepts
// multiple images per message, so this is one round trip either way rather
// than a separate call per image.
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
		// $fetch is auto-imported by Nitro.
		ollamaResponse = await $fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, {
			method: 'POST',
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

// Matches the certifying body text the vision model read off the packaging
// against the app's known HalalLogo records. Deliberately loose (case-
// insensitive, substring both ways) because packaging text and our DB
// entries won't always match exactly — e.g. the model may read "JAKIM" off
// the logo while the DB stores "Department of Islamic Development Malaysia
// (JAKIM)". A false negative here just means the product isn't linked to a
// known logo (halal_logo_id stays null); it never fabricates a match.
function resolveHalalLogoMatch(certifyingBodyText: string, logos: HalalLogoRecord[]): HalalLogoRecord | null {
	const normalized = certifyingBodyText.trim().toLowerCase()
	if (!normalized) return null

	return (
		logos.find((logo) => {
			const known = logo.certifying_body.trim().toLowerCase()
			if (!known) return false
			return known.includes(normalized) || normalized.includes(known)
		}) ?? null
	)
}

// ---------- Handler ----------

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

	// Encoded once, reused in two forms: the raw base64 Ollama expects for
	// its `images` array, and the data-URI form the frontend expects for
	// direct <img :src> rendering (PantryPage.vue and HomePage.vue read
	// product.image_base64 as a ready-to-render src, not a bare base64 blob).
	const base64Raw = imageField.data.toString('base64')
	const mimeType = imageField.type || 'image/jpeg'
	const imageDataUri = `data:${mimeType};base64,${base64Raw}`

	// Optional back-of-package photo (ingredients list, nutrition facts,
	// certification marks). ScanPage.vue lets the user skip this step, so
	// it's genuinely optional here too — everything below degrades to the
	// original front-only behavior when it's absent.
	const imageBackField = form.find((f) => f.name === 'image_back')
	const hasBackImage = Boolean(imageBackField?.filename)

	const base64RawBack = hasBackImage ? imageBackField!.data.toString('base64') : null
	const imageDataUriBack = hasBackImage ? `data:${imageBackField!.type || 'image/jpeg'};base64,${base64RawBack}` : null

	// Optional hidden text field to bypass the AI call during testing —
	// send a form field named "mock_ingredients" (e.g. "Milk, Sugar") to
	// control the verdict without needing Ollama running locally.
	const mockTextField = form.find((f) => f.name === 'mock_ingredients')

	let extraction: ScanAiExtraction

	if (mockTextField?.data) {
		const mockText = mockTextField.data.toString('utf-8')
		extraction = {
			product_name: imageField.filename,
			brand: 'Scanned Product',
			ingredients_text: mockText,
			simplified_ingredients: mockText,
			// Mock runs bypass the vision call entirely, so there's no image to
			// read a logo off — always "not detected" rather than guessing.
			halal_logo_detected: false,
			certifying_body: '',
		}
	} else {
		const imagesForAi = base64RawBack ? [base64Raw, base64RawBack] : [base64Raw]
		extraction = await extractProductInfoFromImage(imagesForAi)
	}

	let { verdict, reasons } = determineVerdict(extraction.ingredients_text)

	// Pull the logged-in user's real allergen profile (not the hardcoded
	// demo user used elsewhere) and the app's known Halal certifying bodies
	// in parallel — neither depends on the other.
	const [userWithAllergens, halalLogos] = await Promise.all([
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
			},
		}),
		prisma.halalLogo.findMany({
			select: { id: true, certifying_body: true, is_accredited: true },
		}),
	])

	// Only try to resolve a known logo if the model actually saw a logo on
	// the packaging — a legible certifying_body with halal_logo_detected
	// false shouldn't happen per the prompt, but guard against it anyway.
	const matchedHalalLogo = extraction.halal_logo_detected ? resolveHalalLogoMatch(extraction.certifying_body, halalLogos) : null

	const combinedIngredientText = `${extraction.ingredients_text} ${extraction.simplified_ingredients}`

	// Deterministic check always runs — this is the safety-net baseline.
	const stringMatches = findMatchedUserAllergens(combinedIngredientText, userWithAllergens?.allergens ?? [])

	// Semantic check runs in addition, catching matches the fixed
	// IngredientMapping table doesn't have yet. Skipped for mock-ingredient
	// test runs to avoid burning an AI call on synthetic data.
	const semanticMatches = mockTextField?.data
		? []
		: await matchUserAllergensSemantically(combinedIngredientText, userWithAllergens?.allergens ?? [])

	// Merge by allergen id — a string-match hit is always kept as confidence
	// 1 even if the semantic pass also found it (or found it with lower
	// confidence); an allergen only found by the semantic pass keeps the
	// AI's own confidence score. (Shared with the recipes routes so both
	// score/merge allergen matches identically.)
	const matchedUserAllergens = mergeMatchedAllergens(stringMatches, semanticMatches)

	// A personal allergen match always wins over the generic keyword verdict —
	// this is a real health risk for this specific user, not a general caution.
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
				// Conditionally spread rather than `halal_logo_id: matchedHalalLogo?.id ?? undefined` —
				// with the relation now optional, TS can't disambiguate the checked
				// (relation-object) vs. unchecked (scalar-FK) create-input variants
				// when the key is present but possibly `undefined`. Omitting the key
				// entirely when there's no match sidesteps that, and still inserts
				// NULL since halal_logo_id has no @default.
				...(matchedHalalLogo ? { halal_logo_id: matchedHalalLogo.id } : {}),
			},
		})

		const scan = await prisma.scan.create({
			data: {
				image_url: `uploads/${imageField.filename}`,
				image_url_back: hasBackImage ? `uploads/${imageBackField!.filename}` : undefined,
				scan_time: new Date(),
				// If any allergen matched, use the lowest confidence among matches —
				// that's the weakest link in the Red verdict, so it's the honest
				// number to show the user and to compare against the admin's
				// auto-flag threshold later. Otherwise fall back to the prior
				// placeholder (no per-scan OCR confidence signal exists yet).
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

		// Two independent triggers, either of which flags this scan for admin
		// review: a Red safety verdict (covers both the generic keyword check
		// and any matched user allergen, since both already set verdict to
		// 'Red' above), or a Halal logo that was visibly detected on the
		// packaging but couldn't be matched to a known certifying body in the
		// HalalLogo table — an unverifiable claim, not necessarily a false
		// one, which is exactly the kind of judgment call that should go to
		// a human rather than be silently trusted or silently rejected.
		const halalUnverified = extraction.halal_logo_detected && matchedHalalLogo === null
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

			// Best-effort — a failure here shouldn't break the scan response
			// the user is actively waiting on. admin_id/status default to
			// null/"pending" until an admin resolves it via approve/dismiss.
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

		// Shape matches what ScanPage.vue's handleUpload() reads via `result.scan`.
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
					image_base64: product.image_base64,
					image_base64_back: product.image_base64_back,
				},
				safety_verdict: scan.safety_verdict,
				flag_reason: scan.flag_reason,
				matched_user_allergens: matchedUserAllergens.map((a) => a.name),
				halal: {
					logo_detected: extraction.halal_logo_detected,
					certifying_body: extraction.certifying_body || null,
					// null = logo detected but not one of our known certifying bodies
					// (unverifiable, not necessarily untrustworthy). false/true only
					// when we actually matched it to a known HalalLogo record.
					is_accredited: matchedHalalLogo?.is_accredited ?? null,
					matched_known_logo: matchedHalalLogo !== null,
				},
				scan_time: scan.scan_time,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to save scan:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to save scan.' })
	}
})
