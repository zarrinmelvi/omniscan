import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAuth } from '../../utils/requireAuth'
import { OLLAMA_ENDPOINT, SCAN_VISION_MODEL } from '../../lib/ollama-models'
import { stripCodeFences } from '../../lib/ai-json'
import { normalizeToDateStringOrNull } from '../../lib/date-parse'

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
}

function buildAnalyzePrompt(): string {
	return [
		'You are a food-label analysis assistant.',
		'Determine whether the attached photo shows a FOOD OR BEVERAGE product intended for human consumption.',
		'Respond with ONLY a single JSON object, no prose, no markdown code fences, matching this shape exactly:',
		'{"is_food_product": boolean, "product_name": string, "expiration_date": string | null, "ingredients_text": string}.',
		'Set is_food_product to false for any non-food item (cosmetics, cleaning supplies, electronics, clothing, etc.).',
		'When is_food_product is false, set product_name and ingredients_text to "" and expiration_date to null.',
		'When is_food_product is true:',
		'product_name is the product name as printed on the label.',
		'expiration_date is any printed expiry/best-before/use-by date converted to YYYY-MM-DD, or null if absent or unreadable.',
		'ingredients_text is the raw ingredient list as printed on the label, or "" if not visible.',
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
	}
}

export default defineEventHandler(async (event) => {
	requireAuth(event)

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
		}
	}

	return extraction
})
