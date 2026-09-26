import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAuth } from '../../utils/requireAuth'
import { OLLAMA_ENDPOINT, SCAN_VISION_MODEL } from '../../lib/ollama-models'
import { stripCodeFences } from '../../lib/ai-json'
import { normalizeToDateStringOrNull } from '../../lib/date-parse'
import { prisma } from '../../lib/prisma'
import { findMatchedUserAllergens, matchUserAllergensSemantically, mergeMatchedAllergens } from '../../lib/allergen-matching'
import { DIETARY_ALLERGEN_MAP } from '../../lib/dietary-map'

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
	message: { role: string; content: string }
	done: boolean
}

interface UploadAiExtraction {
	is_food_product: boolean
	product_name: string
	expiration_date: string | null
	ingredients_text: string
	simplified_ingredients: string
	net_quantity: number | null
	net_unit: string | null
}

function buildAnalyzePrompt(): string {
	return [
		'You are a food-label analysis assistant.',
		'Determine whether the attached photo shows a FOOD OR BEVERAGE product intended for human consumption.',
		'Respond with ONLY a single JSON object, no prose, no markdown code fences, matching this shape exactly:',
		'{"is_food_product": boolean, "product_name": string, "expiration_date": string | null, "ingredients_text": string, "simplified_ingredients": string, "net_quantity": number | null, "net_unit": string | null}.',
		'Set is_food_product to false for any non-food item (cosmetics, cleaning supplies, electronics, clothing, etc.).',
		'When is_food_product is false, set product_name and ingredients_text to "" and expiration_date to null.',
		'When is_food_product is true:',
		'product_name is the product name as printed on the label.',
		'expiration_date is any printed expiry/best-before/use-by date converted to YYYY-MM-DD, or null if absent or unreadable.',
		'ingredients_text is the raw ingredient list as printed on the label, or "" if not visible.',
		'"simplified_ingredients" should restate the ingredient list as a comma-separated plain-language breakdown: (1) explain chemical names in parentheses e.g. "Carrageenan (seaweed thickener)", "Alpha-tocopherol (Vitamin E)"; (2) name hidden allergen derivatives e.g. "Casein (milk protein)", "Ovalbumin (egg white protein)"; (3) keep everyday names as-is; return "" if ingredients_text is empty.',
		'"net_quantity" is the numeric net quantity on the label (e.g. 500 for "500ml"). Return only the number or null.',
		'"net_unit" is the unit of measure as printed, lowercase (e.g. "ml", "g", "L", "kg", "oz"). Return null if absent.',
		'Do not invent information not visible on the packaging.',
	].join(' ')
}

function coerceUploadExtraction(value: unknown): UploadAiExtraction | null {
	if (!value || typeof value !== 'object') return null
	const c = value as Record<string, unknown>
	return {
		is_food_product: c.is_food_product === true,
		product_name: typeof c.product_name === 'string' ? c.product_name : '',
		expiration_date: normalizeToDateStringOrNull(c.expiration_date),
		ingredients_text: typeof c.ingredients_text === 'string' ? c.ingredients_text : '',
		simplified_ingredients: typeof c.simplified_ingredients === 'string' ? c.simplified_ingredients : '',
		net_quantity: typeof c.net_quantity === 'number' ? c.net_quantity : null,
		net_unit: typeof c.net_unit === 'string' && c.net_unit.trim() ? c.net_unit.trim().toLowerCase() : null,
	}
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const form = await readMultipartFormData(event)
	if (!form) {
		throw createError({ statusCode: 400, statusMessage: 'Missing form data.' })
	}

	const imageField = form.find((f) => f.name === 'image')
	if (!imageField || !imageField.data) {
		throw createError({ statusCode: 400, statusMessage: 'Missing image field.' })
	}

	const base64Raw = imageField.data.toString('base64')
	const mimeType = imageField.type || 'image/jpeg'
	const imageDataUri = `data:${mimeType};base64,${base64Raw}`

	const requestPayload: OllamaChatRequestBody = {
		model: SCAN_VISION_MODEL,
		stream: false,
		format: 'json',
		messages: [
			{
				role: 'user',
				content: buildAnalyzePrompt(),
				images: [base64Raw],
			},
		],
	}

	let ollamaResponse: OllamaChatResponse

	try {
		ollamaResponse = await $fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
			},
			body: requestPayload,
		})
	} catch (err) {
		throw createError({
			statusCode: 502,
			statusMessage: 'Could not reach the AI vision service. Please try again.',
			cause: err,
		})
	}

	const rawContent = ollamaResponse?.message?.content
	if (!rawContent) {
		throw createError({ statusCode: 502, statusMessage: 'AI service returned an empty response.' })
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(stripCodeFences(rawContent))
	} catch (err) {
		throw createError({
			statusCode: 502,
			statusMessage: 'AI service response was not valid JSON.',
			cause: err,
		})
	}

	const extraction = coerceUploadExtraction(parsed)
	if (!extraction) {
		throw createError({ statusCode: 502, statusMessage: 'AI service response did not match the expected shape.' })
	}

	if (!extraction.is_food_product) {
		return {
			is_food_product: false,
			product_name: '',
			expiration_date: null,
			ingredients_text: '',
			net_quantity: null,
			net_unit: null,
		}
	}

	// Load user allergens and run matching (same pattern as scan endpoint)
	const userWithAllergens = await prisma.user.findUnique({
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
			dietary_prof: { select: { custom_preferences: true }, orderBy: { updated_at: 'desc' }, take: 1 },
		},
	})

	const userAllergens = userWithAllergens?.allergens ?? []
	// Combine product_name + ingredients_text so raw whole-food products
	// (e.g. a bowl of eggs with no printed ingredient list) are still matched
	// against the user's allergen profile via the product name.
	// Mirrors the scan endpoint's combinedIngredientText pattern.
	const combinedText = `${extraction.product_name} ${extraction.ingredients_text}`.trim()
	const stringMatches = findMatchedUserAllergens(combinedText, userAllergens)
	const semanticMatches = await matchUserAllergensSemantically(combinedText, userAllergens)
	const matchedAllergens = mergeMatchedAllergens(stringMatches, semanticMatches)

	const customPreferences = userWithAllergens?.dietary_prof?.[0]?.custom_preferences ?? []
	const preferenceWarnings = new Set<string>()
	customPreferences.forEach((pref: string) => {
		const rule = DIETARY_ALLERGEN_MAP[pref.toLowerCase().trim()]
		if (rule) {
			if (rule.keywords.some((kw) => combinedText.includes(kw))) {
				preferenceWarnings.add(rule.label)
			}
		}
	})
	const allMatchedNames = Array.from(new Set([...matchedAllergens.map((a) => a.name), ...Array.from(preferenceWarnings)]))

	return {
		...extraction,
		matched_user_allergens: allMatchedNames,
	}
})
