import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { findMatchedUserAllergens } from '../../lib/allergen-matching'
import { matchIngredientsToPantry, findNonHalalKeywords, type RawIngredient } from '../../lib/recipe-matching'

// How many pg_trgm candidates to pull before scoring/filtering down to the
// final list — wider than CANDIDATE_LIMIT below so allergen/Halal exclusions
// still leave enough recipes to show.
const SQL_CANDIDATE_LIMIT = 60
// How many recipes to actually return after filtering.
const RESULTS_LIMIT = 15
// Caps how many distinct pantry keywords go into the trigram query — bounds
// query cost for users with very large pantries.
const MAX_PANTRY_KEYWORDS = 60

const STOPWORDS = new Set([
	'the',
	'and',
	'with',
	'for',
	'of',
	'in',
	'fresh',
	'original',
	'classic',
	'new',
	'pack',
	'bottle',
	'can',
	'box',
	'net',
	'wt',
	'ml',
	'kg',
	'ltr',
	'pcs',
	'pc',
	'ea',
])

// Pantry holds branded product names ("Nestlé Fresh Milk 1L 500ml Pack") —
// this pulls out the words worth searching recipes for, dropping units,
// stopwords, and pure numbers rather than searching on the whole noisy string.
function extractPantryKeywords(productNames: string[]): string[] {
	const words = new Set<string>()

	for (const name of productNames) {
		const tokens = name
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter(Boolean)

		for (const token of tokens) {
			if (token.length < 3) continue
			if (/^\d+$/.test(token)) continue
			if (STOPWORDS.has(token)) continue
			words.add(token)
		}
	}

	return Array.from(words).slice(0, MAX_PANTRY_KEYWORDS)
}

interface CandidateRow {
	id: number
	matched_word_count: number
	best_score: number
}

function coerceRawIngredients(value: unknown): RawIngredient[] {
	if (!Array.isArray(value)) return []
	return value
		.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
		.map((item) => ({
			name: typeof item.name === 'string' ? item.name : '',
			quantity: typeof item.quantity === 'number' ? item.quantity : null,
			unit: typeof item.unit === 'string' ? item.unit : null,
		}))
		.filter((i) => i.name.trim().length > 0)
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	try {
		const [pantryItems, userWithProfile] = await Promise.all([
			prisma.pantryItem.findMany({
				where: { user_id: authUser.id, is_archived: false },
				select: { id: true, product: { select: { product_name: true } } },
			}),
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
					dietary_prof: { select: { halal_pref: true }, orderBy: { updated_at: 'desc' }, take: 1 },
				},
			}),
		])

		if (pantryItems.length === 0) {
			return { success: true, recipes: [], message: 'Add items to your pantry to get recipe suggestions.' }
		}

		const pantryProducts = pantryItems.map((p) => ({ id: p.id, product_name: p.product.product_name }))
		const keywords = extractPantryKeywords(pantryProducts.map((p) => p.product_name))

		if (keywords.length === 0) {
			return { success: true, recipes: [], message: 'No searchable ingredients found in your pantry yet.' }
		}

		// pg_trgm word_similarity ("<%"/"%") finds recipes whose
		// ingredient_search_text contains a substring similar to each pantry
		// keyword — this is what actually makes fuzzy matching branded product
		// names ("Silver Swan Soy Sauce") against generic ingredient names
		// ("soy sauce") tractable at ~500k rows. Requires the pg_trgm extension
		// + GIN index from setup-recipe-search-index.sql to be fast; without
		// it this still works, just as a sequential scan.
		const candidates = await prisma.$queryRaw<CandidateRow[]>`
			WITH pantry_words AS (
				SELECT unnest(${keywords}::text[]) AS word
			),
			matches AS (
				SELECT r.id, pw.word, word_similarity(pw.word, r.ingredient_search_text) AS score
				FROM "Recipe" r, pantry_words pw
				WHERE pw.word <% r.ingredient_search_text
			)
			SELECT id, COUNT(DISTINCT word)::int AS matched_word_count, MAX(score) AS best_score
			FROM matches
			GROUP BY id
			ORDER BY matched_word_count DESC, best_score DESC
			LIMIT ${SQL_CANDIDATE_LIMIT}
		`

		if (candidates.length === 0) {
			return { success: true, recipes: [], message: "No recipes found matching what's in your pantry yet." }
		}

		const candidateIds = candidates.map((c) => c.id)
		const rankById = new Map(candidates.map((c, i) => [c.id, i]))

		const recipeRows = await prisma.recipe.findMany({
			where: { id: { in: candidateIds } },
			select: { id: true, name: true, instructions: true, raw_ingredients: true },
		})
		recipeRows.sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0))

		// Fetched once for all candidates rather than per-recipe inside the
		// loop below — same N+1 concern as everything else in this file that
		// already batches pantry/allergen lookups up front.
		const interactions = await prisma.recipeInteraction.findMany({
			where: { user_id: authUser.id, recipe_id: { in: candidateIds } },
			select: { recipe_id: true, liked: true, made_at: true },
		})
		const interactionByRecipeId = new Map(interactions.map((i) => [i.recipe_id, i]))

		const userAllergens = userWithProfile?.allergens ?? []
		const halalPref = userWithProfile?.dietary_prof?.[0]?.halal_pref ?? false

		const results: {
			id: number
			name: string
			instructions: string
			matched_count: number
			total_count: number
			missing_ingredients: string[]
			liked: boolean
			made: boolean
		}[] = []

		for (const recipe of recipeRows) {
			const ingredients = coerceRawIngredients(recipe.raw_ingredients)
			if (ingredients.length === 0) continue

			const combinedText = ingredients.map((i) => i.name).join(', ')

			// Real per-user allergen check (deterministic only at list time — an
			// AI semantic pass on every candidate here would be too slow/costly
			// for a list endpoint; the semantic pass runs once, on the single
			// chosen recipe, in /api/recipes/make). Recipes with a matched
			// allergen are excluded outright, not just flagged — this is a
			// suggestion list, so the safer default is to not suggest it at all.
			const allergenMatches = findMatchedUserAllergens(combinedText, userAllergens)
			if (allergenMatches.length > 0) continue

			if (halalPref && findNonHalalKeywords(combinedText).length > 0) continue

			const { matchedIngredientNames, missingIngredientNames } = matchIngredientsToPantry(ingredients, pantryProducts)
			const interaction = interactionByRecipeId.get(recipe.id)

			results.push({
				id: recipe.id,
				name: recipe.name,
				instructions: recipe.instructions,
				matched_count: matchedIngredientNames.length,
				total_count: ingredients.length,
				missing_ingredients: missingIngredientNames,
				liked: interaction?.liked ?? false,
				made: interaction?.made_at != null,
			})

			if (results.length >= RESULTS_LIMIT) break
		}

		return { success: true, recipes: results }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to generate recipe suggestions:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to generate recipe suggestions.' })
	}
})
