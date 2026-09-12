import { prisma } from './prisma'
import { OLLAMA_ENDPOINT, GENERATION_MODEL } from './ollama-models'
import { stripCodeFences } from './ai-json'
import { findMatchedUserAllergens, type UserAllergenRecord } from './allergen-matching'
import { findNonHalalKeywords } from './recipe-matching'

export interface DietaryProfileInput {
	allergens: UserAllergenRecord[]
	halalPref: boolean
	customPreferences: string[]
}

export interface DisallowedIngredient {
	name: string
	reason: string
	source: 'allergen' | 'halal' | 'preference' | 'ai'
}

export interface DisallowedIngredientsResult {
	disallowedIngredientNames: string[]
	details: DisallowedIngredient[]
}

interface OllamaChatResponse {
	message: { content: string }
}

function findDeterministicDisallowed(catalogIngredientNames: string[], profile: DietaryProfileInput): DisallowedIngredient[] {
	const results: DisallowedIngredient[] = []

	for (const name of catalogIngredientNames) {
		if (profile.allergens.length > 0) {
			const allergenHits = findMatchedUserAllergens(name, profile.allergens)
			if (allergenHits.length > 0) {
				results.push({
					name,
					reason: `Matches your allergen: ${allergenHits.map((a) => a.name).join(', ')}`,
					source: 'allergen',
				})
				continue
			}
		}

		if (profile.halalPref) {
			const halalHits = findNonHalalKeywords(name)
			if (halalHits.length > 0) {
				results.push({
					name,
					reason: `Contains a non-Halal ingredient keyword: ${halalHits.join(', ')}`,
					source: 'halal',
				})
			}
		}
	}

	return results
}

function buildCatalogNameLookup(catalogIngredientNames: string[]): Map<string, string> {
	const lookup = new Map<string, string>()
	for (const name of catalogIngredientNames) {
		lookup.set(name.toLowerCase(), name)
	}
	return lookup
}

async function findAiDisallowed(
	catalogIngredientNames: string[],
	alreadyDisallowed: Set<string>,
	profile: DietaryProfileInput,
): Promise<DisallowedIngredient[]> {
	const candidateNames = catalogIngredientNames.filter((n) => !alreadyDisallowed.has(n.toLowerCase()))
	if (candidateNames.length === 0) return []

	const allergenContext = profile.allergens.map((a) => ({
		name: a.name,
		known_terms: [a.scientific_name, ...a.ingredient_mapping.flatMap((m) => [m.scientific_term, m.simplified_term])].filter(Boolean),
	}))

	const prompt = [
		'You are a dietary-safety assistant helping find safe alternative products for a user, based on a fixed catalog of known ingredients.',
		'Exact allergen matches and common non-Halal keywords have ALREADY been excluded by simpler checks — do not re-flag ingredients for those obvious reasons.',
		'Your job is to catch what those simpler checks would miss:',
		'1. Freeform dietary preferences that have no fixed keyword list at all (this is the main thing to reason about).',
		"2. Genuinely subtle allergen/Halal cases — a real derivative, synonym, or technical name that a simple substring check on the allergen's own name wouldn't catch.",
		'',
		`User's allergens (with already-known terms, for context only — don't re-flag these):`,
		JSON.stringify(allergenContext),
		`Halal preference: ${profile.halalPref}`,
		`Freeform dietary preferences: ${JSON.stringify(profile.customPreferences)}`,
		'',
		'Candidate ingredients to consider (choose ONLY from this exact list — do not invent, pluralize, or rephrase any name):',
		JSON.stringify(candidateNames),
		'',
		'Respond with ONLY a JSON object, no prose, no markdown code fences, in exactly this shape:',
		'{"disallowed": [{"ingredient": "<exact name from the candidate list>", "reason": "<short reason>"}]}',
		'If nothing genuinely needs flagging, return {"disallowed": []}. Do not flag an ingredient without a real basis — an empty list is a valid and expected answer for a user with no special dietary preferences.',
	].join('\n')

	try {
		const response = await $fetch<OllamaChatResponse>(OLLAMA_ENDPOINT, {
			method: 'POST',
			body: {
				model: GENERATION_MODEL,
				stream: false,
				format: 'json',
				messages: [{ role: 'user', content: prompt }],
			},
		})

		const rawContent = response?.message?.content
		if (!rawContent) return []

		const parsed = JSON.parse(stripCodeFences(rawContent)) as { disallowed?: unknown }
		if (!parsed || !Array.isArray(parsed.disallowed)) return []

		const catalogLookup = buildCatalogNameLookup(catalogIngredientNames)
		const results: DisallowedIngredient[] = []

		for (const item of parsed.disallowed) {
			if (!item || typeof item !== 'object') continue
			const ingredient = (item as Record<string, unknown>).ingredient
			const reason = (item as Record<string, unknown>).reason

			if (typeof ingredient !== 'string') continue

			const realName = catalogLookup.get(ingredient.toLowerCase())
			if (!realName) {
				console.warn(`Alternatives AI reasoning proposed a non-catalog ingredient name, dropped: "${ingredient}"`)
				continue
			}

			results.push({
				name: realName,
				reason: typeof reason === 'string' && reason.trim() ? reason : 'Flagged by AI dietary reasoning',
				source: 'ai',
			})
		}

		return results
	} catch (err) {
		console.error('Alternatives AI reasoning call failed — falling back to deterministic matches only:', err)
		return []
	}
}

export async function determineDisallowedCatalogIngredients(profile: DietaryProfileInput): Promise<DisallowedIngredientsResult> {
	const hasAnyRestriction = profile.allergens.length > 0 || profile.halalPref || profile.customPreferences.length > 0

	if (!hasAnyRestriction) {
		return { disallowedIngredientNames: [], details: [] }
	}

	const catalogIngredients = await prisma.catalogIngredient.findMany({ select: { name: true } })
	const catalogIngredientNames = catalogIngredients.map((i) => i.name)

	if (catalogIngredientNames.length === 0) {
		return { disallowedIngredientNames: [], details: [] }
	}

	const deterministicMatches = findDeterministicDisallowed(catalogIngredientNames, profile)
	const alreadyDisallowed = new Set(deterministicMatches.map((m) => m.name.toLowerCase()))

	const aiMatches = await findAiDisallowed(catalogIngredientNames, alreadyDisallowed, profile)

	const allMatches = [...deterministicMatches, ...aiMatches]
	const disallowedIngredientNames = Array.from(new Set(allMatches.map((m) => m.name)))

	return { disallowedIngredientNames, details: allMatches }
}
