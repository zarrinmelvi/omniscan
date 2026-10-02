import { OLLAMA_ENDPOINT, GENERATION_MODEL } from './ollama-models'
import { stripCodeFences } from './ai-json'

// Web search runs on the same Ollama host as the chat endpoint. Derive the
// base from OLLAMA_ENDPOINT (…/api/chat) so a custom OLLAMA_HOST is respected.
const WEB_SEARCH_ENDPOINT = OLLAMA_ENDPOINT.replace(/\/api\/chat$/, '/api/web_search')

export interface WebSearchResult {
	title: string
	url: string
	content: string
}

/**
 * Strict, parseable schema for a retrieved alternative. Every field is a
 * non-empty string; callers can rely on this shape.
 */
export interface StructuredAlternative {
	scientific_raw_term: string
	simplified_consumer_term: string
	allergen_category: string
	halal_compliance_note: string
}

/**
 * Thin wrapper over Ollama's web search API. Reuses the existing OLLAMA_API_KEY.
 * Defensive: never throws, returns [] on any failure or missing key.
 */
export async function ollamaWebSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
	if (!process.env.OLLAMA_API_KEY) {
		console.warn('[web-search] OLLAMA_API_KEY not set — skipping web search fallback.')
		return []
	}
	const trimmed = query.trim()
	if (!trimmed) return []

	try {
		console.log(`[web-search] POST ${WEB_SEARCH_ENDPOINT} query="${trimmed}"`)
		const res = await $fetch<{ results?: unknown }>(WEB_SEARCH_ENDPOINT, {
			method: 'POST',
			headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
			body: { query: trimmed, max_results: Math.min(Math.max(maxResults, 1), 10) },
		})
		if (!res || !Array.isArray(res.results)) {
			console.warn('[web-search] Response had no results array:', JSON.stringify(res)?.slice(0, 300))
			return []
		}
		const mapped = res.results
			.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
			.map((r) => ({
				title: typeof r.title === 'string' ? r.title : '',
				url: typeof r.url === 'string' ? r.url : '',
				content: typeof r.content === 'string' ? r.content : '',
			}))
			.filter((r) => r.content.trim() || r.title.trim())
		console.log(`[web-search] Got ${mapped.length} usable result(s).`)
		return mapped
	} catch (err: any) {
		const status = err?.status ?? err?.statusCode ?? err?.response?.status
		const detail = err?.data ?? err?.response?._data ?? err?.message
		console.error(`[web-search] Ollama web_search call failed (status=${status ?? 'unknown'}):`, detail)
		return []
	}
}

/**
 * Validate + coerce one raw AI object into a StructuredAlternative, or null if
 * it doesn't have the required non-empty string fields.
 */
function toStructuredAlternative(raw: unknown): StructuredAlternative | null {
	if (!raw || typeof raw !== 'object') return null
	const r = raw as Record<string, unknown>
	const scientific = typeof r.scientific_raw_term === 'string' ? r.scientific_raw_term.trim() : ''
	const simplified = typeof r.simplified_consumer_term === 'string' ? r.simplified_consumer_term.trim() : ''
	const allergen = typeof r.allergen_category === 'string' ? r.allergen_category.trim() : ''
	const halal = typeof r.halal_compliance_note === 'string' ? r.halal_compliance_note.trim() : ''
	// Require at least the two identifying terms; fill the descriptive fields
	// with an explicit "Unknown" rather than dropping, so the schema is always complete.
	if (!scientific && !simplified) return null
	return {
		scientific_raw_term: scientific || simplified,
		simplified_consumer_term: simplified || scientific,
		allergen_category: allergen || 'Unknown',
		halal_compliance_note: halal || 'Halal status unverified — check product certification.',
	}
}

/**
 * Web-search fallback for alternatives/ingredient lookups that miss the local
 * database or exceed local scope. Runs a web search for similar certified
 * items/ingredients, then uses the generation model to normalize the retrieved
 * snippets into the strict StructuredAlternative schema.
 *
 * Defensive: never throws. Returns { alternatives: [], sources: [] } on failure.
 */
export async function webSearchAlternatives(params: {
	productName: string
	brandName?: string
	userAllergens?: string
	halalPref?: boolean
}): Promise<{ alternatives: StructuredAlternative[]; sources: { title: string; url: string }[]; debug?: string }> {
	const { productName, brandName = '', userAllergens = 'none', halalPref = false } = params
	const name = productName.trim()
	if (!name) return { alternatives: [], sources: [], debug: 'no-product-name' }

	// 1. Retrieve web context.
	const halalClause = halalPref ? ' halal certified' : ''
	const searchQuery = `${name} ${brandName}${halalClause} alternatives similar products ingredients allergen`.trim()
	const results = await ollamaWebSearch(searchQuery, 5)
	if (results.length === 0) return { alternatives: [], sources: [], debug: 'web-search-returned-no-results' }

	// 2. Normalize retrieved snippets into the strict schema via the generation model.
	const context = results
		.map((r, i) => `[Source ${i + 1}] ${r.title}\n${r.content}`)
		.join('\n\n')
		.slice(0, 12000) // keep well within context limits

	const prompt = [
		'You are a dietary-safety assistant. Using ONLY the web search results below, extract alternative food products or ingredients similar to the queried item that are safer for the user.',
		`Queried item: "${name}"${brandName ? ` by "${brandName}"` : ''}.`,
		`User allergens to avoid: ${userAllergens}.`,
		`User requires Halal-compliant options: ${halalPref ? 'yes' : 'no'}.`,
		'',
		'WEB SEARCH RESULTS:',
		context,
		'',
		'Return ONLY a JSON object, no prose, no markdown fences, in EXACTLY this schema:',
		'{"alternatives": [{"scientific_raw_term": "string", "simplified_consumer_term": "string", "allergen_category": "string", "halal_compliance_note": "string"}]}',
		'Field definitions:',
		'- scientific_raw_term: the technical/scientific or raw label name of the item or key ingredient.',
		'- simplified_consumer_term: the plain, everyday consumer-facing name.',
		'- allergen_category: the primary allergen category it relates to or is free from (e.g. "Dairy-free", "Contains tree nuts", "Gluten-free"). Use "Unknown" if the results do not say.',
		'- halal_compliance_note: a short note on Halal suitability based on the results (e.g. "Halal-certified by JAKIM", "No certification found — verify label"). Use "Halal status unverified — check product certification." if unknown.',
		'Return at most 5 items. If the results contain nothing usable, return {"alternatives": []}.',
	].join('\n')

	try {
		const response = await $fetch<{ message?: { content?: string } }>(OLLAMA_ENDPOINT, {
			method: 'POST',
			headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
			body: {
				model: GENERATION_MODEL,
				stream: false,
				format: 'json',
				messages: [{ role: 'user', content: prompt }],
			},
		})

		const rawContent = response?.message?.content
		if (!rawContent) return { alternatives: [], sources: [], debug: 'model-returned-no-content' }

		let parsed: unknown
		try {
			parsed = JSON.parse(stripCodeFences(rawContent))
		} catch {
			return { alternatives: [], sources: [], debug: 'model-output-unparseable' }
		}

		const list = (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).alternatives))
			? (parsed as Record<string, unknown>).alternatives as unknown[]
			: []

		const alternatives = list
			.map(toStructuredAlternative)
			.filter((a): a is StructuredAlternative => a !== null)
			.slice(0, 5)

		const sources = results.map((r) => ({ title: r.title, url: r.url })).filter((s) => s.url)

		console.log(`[web-search] Normalized ${alternatives.length} structured alternative(s) from ${results.length} web result(s).`)
		return { alternatives, sources, debug: `ok-${alternatives.length}-alternatives` }
	} catch (err) {
		console.error('[web-search] Alternative normalization call failed:', err)
		return { alternatives: [], sources: [], debug: 'normalization-call-failed' }
	}
}
