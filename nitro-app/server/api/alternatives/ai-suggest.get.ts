import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../utils/requireAuth'
import { OLLAMA_ENDPOINT, GENERATION_MODEL } from '../../lib/ollama-models'
import { stripCodeFences } from '../../lib/ai-json'
import { webSearchAlternatives } from '../../lib/web-search-fallback'

export default defineEventHandler(async (event) => {
	requireAuth(event)

	const query = getQuery(event)
	const product_name = String(query.product_name ?? '').trim()
	const brand_name = String(query.brand_name ?? '').trim()
	const user_allergens = String(query.user_allergens ?? '').trim()
	const halal_pref = String(query.halal_pref ?? '').trim() === 'true'
	const debugMode = String(query.debug ?? '').trim() === '1'

	if (!product_name) {
		throw createError({ statusCode: 400, statusMessage: 'product_name is required.' })
	}

	const allergenList = user_allergens || 'none'
	const prompt = [
		'You are a food product advisor for Indian and Southeast Asian markets.',
		`Suggest 3-5 real, commercially available food products similar to "${product_name}" by "${brand_name || 'Unknown Brand'}"`,
		`that are less likely to contain these allergens: ${allergenList}.`,
		'Suggest only real products that actually exist in the market.',
		'Respond with ONLY a JSON array, no prose, no markdown fences:',
		'[{"product_name": "string", "brand_name": "string", "reason": "string"}]',
		'The reason should be one sentence explaining why it is a safer alternative.',
		'If no suitable alternatives exist, return an empty array [].',
	].join(' ')

	// Primary AI suggestion call — degrade gracefully to an empty list on any
	// failure (timeout / rate-limit / transient model error) rather than
	// surfacing a hard 502. The web-search fallback below then has a chance to
	// run, and the endpoint always returns a valid payload.
	let suggestions: { product_name: string; brand_name: string; reason: string }[] = []
	try {
		const response = await $fetch<{ message: { content: string } }>(OLLAMA_ENDPOINT, {
			method: 'POST',
			headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
			body: {
				model: GENERATION_MODEL,
				stream: false,
				format: 'json',
				messages: [{ role: 'user', content: prompt }],
			},
		})

		const raw = response?.message?.content
		if (raw) {
			let parsed: unknown
			try {
				parsed = JSON.parse(stripCodeFences(raw))
			} catch {
				parsed = null
			}
			const arr = Array.isArray(parsed) ? parsed : []
			suggestions = arr
				.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
				.map((s) => ({
					product_name: typeof s.product_name === 'string' ? s.product_name : '',
					brand_name: typeof s.brand_name === 'string' ? s.brand_name : '',
					reason: typeof s.reason === 'string' ? s.reason : '',
				}))
				.filter((s) => s.product_name.trim())
		}
	} catch (err) {
		// Non-fatal: log and continue to the web-search fallback.
		console.error('[ai-suggest] Primary AI suggestion call failed — continuing to web fallback:', err)
	}

	if (suggestions.length > 0) {
		console.log(`[ai-suggest] Returning ${suggestions.length} primary AI suggestion(s).`)
		return { suggestions, source: 'ai', web_alternatives: [], sources: [] }
	}

	// Local/model scope miss (or primary call failed) — fall back to a live web
	// search and return strictly-formatted structured alternatives. webSearchAlternatives
	// is itself fully defensive and never throws.
	console.log('[ai-suggest] No primary AI suggestions — invoking web-search fallback.')
	const { alternatives, sources, debug } = await webSearchAlternatives({
		productName: product_name,
		brandName: brand_name,
		userAllergens: allergenList,
		halalPref: halal_pref,
	})
	console.log(`[ai-suggest] Web fallback result: ${alternatives.length} alternative(s) (debug=${debug ?? 'none'}).`)

	return {
		suggestions,
		source: alternatives.length > 0 ? 'web' : 'ai',
		web_alternatives: alternatives,
		sources,
		...(debugMode ? { debug } : {}),
	}
})
