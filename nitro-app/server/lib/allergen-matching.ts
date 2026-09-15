import { OLLAMA_ENDPOINT, ALLERGEN_MATCH_MODEL } from './ollama-models'
import { stripCodeFences } from './ai-json'

interface OllamaChatMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
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

export interface IngredientMappingRecord {
	scientific_term: string
	simplified_term: string
}

export interface UserAllergenRecord {
	id: number
	name: string
	scientific_name: string
	ingredient_mapping: IngredientMappingRecord[]
}

export interface MatchedAllergen {
	id: number
	name: string
	confidence: number
	matched_term?: string
}

interface SemanticAllergenMatch {
	id: number
	name: string
	matched_term: string
	confidence: number
}

export function findMatchedUserAllergens(text: string, allergens: UserAllergenRecord[]): MatchedAllergen[] {
	const normalized = text.toLowerCase()

	return allergens
		.filter((allergen) => {
			const terms = [
				allergen.name,
				allergen.scientific_name,
				...allergen.ingredient_mapping.flatMap((m) => [m.scientific_term, m.simplified_term]),
			]
				.filter(Boolean)
				.map((term) => term.toLowerCase())

			return terms.some((term) => normalized.includes(term))
		})
		.map((allergen) => ({ id: allergen.id, name: allergen.name, confidence: 1 }))
}

export async function matchUserAllergensSemantically(ingredientsText: string, allergens: UserAllergenRecord[]): Promise<SemanticAllergenMatch[]> {
	if (allergens.length === 0 || !ingredientsText.trim()) {
		return []
	}

	const allergenContext = allergens.map((a) => ({
		id: a.id,
		name: a.name,
		known_terms: [a.scientific_name, ...a.ingredient_mapping.flatMap((m) => [m.scientific_term, m.simplified_term])].filter(Boolean),
	}))

	const prompt = [
		"You are a food-safety assistant checking an ingredient list against one user's known allergies.",
		'The user is allergic to the following (each with an id, name, and any already-known ingredient terms/synonyms):',
		JSON.stringify(allergenContext),
		'Ingredient text to check:',
		ingredientsText,
		'Decide which of the user\'s allergens are genuinely present in this ingredient list — including scientific/technical names, known derivatives, and "may contain traces of" disclaimers, even if the exact wording is not in known_terms.',
		'Respond with ONLY a JSON object, no prose, no markdown code fences, in exactly this shape:',
		'{"matches": [{"id": number, "name": string, "matched_term": string, "confidence": number between 0 and 1}]}',
		'If nothing genuinely matches, return {"matches": []}. Do not guess or flag a match without a real textual basis in the ingredient list.',
	].join('\n')

	const requestPayload: OllamaChatRequestBody = {
		model: ALLERGEN_MATCH_MODEL,
		stream: false,
		format: 'json',
		messages: [{ role: 'user', content: prompt }],
	}

	try {
		const response = await $fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
			},
			body: requestPayload,
		})

		const rawContent = response?.message?.content
		if (!rawContent) return []

		const parsed = JSON.parse(stripCodeFences(rawContent)) as { matches?: unknown }
		if (!parsed || !Array.isArray(parsed.matches)) return []

		return parsed.matches
			.filter(
				(m): m is Record<string, unknown> =>
					!!m && typeof m === 'object' && typeof (m as any).id === 'number' && typeof (m as any).name === 'string',
			)
			.map((m) => ({
				id: m.id as number,
				name: m.name as string,
				matched_term: typeof m.matched_term === 'string' ? m.matched_term : '',
				confidence: typeof m.confidence === 'number' ? Math.max(0, Math.min(1, m.confidence)) : 0.5,
			}))
	} catch (err) {
		console.error('Semantic allergen match call failed — falling back to deterministic matching only:', err)
		return []
	}
}

export function mergeMatchedAllergens(stringMatches: MatchedAllergen[], semanticMatches: SemanticAllergenMatch[]): MatchedAllergen[] {
	const matchedById = new Map<number, MatchedAllergen>()
	for (const m of stringMatches) {
		matchedById.set(m.id, m)
	}
	for (const m of semanticMatches) {
		if (!matchedById.has(m.id)) {
			matchedById.set(m.id, { id: m.id, name: m.name, confidence: m.confidence, matched_term: m.matched_term })
		}
	}
	return Array.from(matchedById.values())
}
