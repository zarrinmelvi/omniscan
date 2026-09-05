// server/lib/alternative-reasoning.ts
//
// The AI-reasoning half of Alternatives (see alternative-matching.ts for
// the deterministic half it feeds into). Turns a user's DietaryProfile
// (allergens, halal_pref, custom_preferences) into a list of disallowed
// CatalogIngredient names, ready to pass straight into
// findAlternativeProducts(disallowedIngredientNames).
//
// Follows the same layered pattern already established in
// allergen-matching.ts: a deterministic baseline that never depends on the
// AI succeeding, with the AI call as a genuinely additive layer on top —
// never the other way around. A failed/slow AI call degrades to
// "deterministic matches only," never to "no restrictions applied."
//
// IMPORTANT — grounding against real ingredient names, not free text:
// alternative-matching.ts does exact-string matching against
// CatalogIngredient.name (already lowercased/trimmed). If the AI were
// asked to freely generate disallowed ingredient names, "peanut" vs.
// "peanuts" would silently fail to match anything. To avoid that entirely,
// the AI is given the actual catalog ingredient list and told to choose
// ONLY from those exact names — never to invent new ones. Anything it
// returns that isn't a real, case-insensitive match to the catalog is
// dropped rather than trusted (see validateAgainstCatalog below).

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
	name: string // exact CatalogIngredient.name value
	reason: string
	source: 'allergen' | 'halal' | 'preference' | 'ai'
}

export interface DisallowedIngredientsResult {
	disallowedIngredientNames: string[] // flat list, ready for findAlternativeProducts()
	details: DisallowedIngredient[] // same data, with reasoning — for UI/debugging
}

interface OllamaChatResponse {
	message: { content: string }
}

// ---------- Deterministic baseline ----------

// Reuses the exact same matchers already trusted for scanning/recipes —
// each catalog ingredient name is checked individually rather than as one
// blob of text, since these functions are designed to check "does this
// text contain a match," and we specifically need to know WHICH catalog
// ingredient(s) matched, not just whether something in the whole list did.
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
				continue // already disallowed, no need to also check halal for this one
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

// ---------- AI reasoning layer ----------

// Builds the case-insensitive lookup used to validate the AI's response —
// it must choose from real catalog names, never invent its own.
function buildCatalogNameLookup(catalogIngredientNames: string[]): Map<string, string> {
	const lookup = new Map<string, string>()
	for (const name of catalogIngredientNames) {
		lookup.set(name.toLowerCase(), name)
	}
	return lookup
}

// Handles everything the deterministic pass structurally can't: freeform
// custom_preferences (e.g. "Keto", "Nut-Free") have no lookup table at all
// — this is the part of Alternatives the adviser specifically asked for
// genuine AI reasoning on, not a fixed keyword list. Also catches subtler
// allergen/Halal cases the deterministic pass's exact-term matching missed
// (e.g. a derivative or synonym not yet in IngredientMapping).
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

			// Validate against the real catalog rather than trusting the AI's
			// casing/spelling — this is the guard against exactly the
			// "peanut" vs. "peanuts" mismatch problem described at the top of
			// this file. Anything that doesn't exactly match (case-insensitive)
			// a real CatalogIngredient is silently dropped, not passed through.
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

// ---------- Public entry point ----------

/**
 * Determines the full disallowed-ingredient list for a user, combining:
 * 1. Deterministic allergen matching (reused from allergen-matching.ts)
 * 2. Deterministic Halal keyword matching (reused from recipe-matching.ts)
 * 3. AI reasoning for freeform custom_preferences + subtler cases
 *
 * The deterministic passes (1-2) always run and never depend on the AI
 * call succeeding — if the AI call fails or the user has no
 * custom_preferences worth reasoning about, this still returns a safe,
 * real disallowed list from (1-2) alone.
 *
 * Returns early with an empty result (no AI call made) if the user has no
 * allergens, no Halal preference, and no custom preferences — there is
 * nothing to reason about.
 */
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
