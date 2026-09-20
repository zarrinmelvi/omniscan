import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { findMatchedUserAllergens } from '../../lib/allergen-matching'
import { matchIngredientsToPantry, findNonHalalKeywords, extractPantryKeywords, type RawIngredient } from '../../lib/recipe-matching'

const SQL_CANDIDATE_LIMIT = 60
const RESULTS_LIMIT = 15

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
			select: { id: true, name: true, instructions: true, raw_ingredients: true, image_url: true },
		})
		recipeRows.sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0))

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
			matched_ingredients: { name: string; quantity: number | null; unit: string | null }[]
			matched_count: number
			total_count: number
			missing_ingredients: { name: string; quantity: number | null; unit: string | null }[]
			liked: boolean
			made: boolean
			image_url: string | null
			allergen_warnings: string[]
		}[] = []

		for (const recipe of recipeRows) {
			const ingredients = coerceRawIngredients(recipe.raw_ingredients)
			if (ingredients.length === 0) continue

			const combinedText = ingredients.map((i) => i.name).join(', ')

			// Was previously `if (allergenMatches.length > 0) continue` — a
			// recipe containing an allergen is no longer hidden from
			// suggestions entirely. The user can still choose to make it;
			// they just see which allergen(s) are present first, the same
			// way Scan already surfaces allergen warnings without blocking
			// "Add to Pantry". Halal exclusion below is untouched — only the
			// allergen behavior changed, per what was actually asked for.
			const allergenMatches = findMatchedUserAllergens(combinedText, userAllergens)

			if (halalPref && findNonHalalKeywords(combinedText).length > 0) continue

			const { matchedIngredients, missingIngredients } = matchIngredientsToPantry(ingredients, pantryProducts)
			const interaction = interactionByRecipeId.get(recipe.id)
			const isMade = interaction?.made_at != null
			const matchedCount = matchedIngredients.length
			const totalCount = ingredients.length

			// 1. Exclude recipes with 0 matching items in pantry
			if (matchedCount === 0) {
				continue
			}

			// 2. Exclude recipes marked as 'made' unless all required ingredients are present in pantry again
			if (isMade && matchedCount < totalCount) {
				continue
			}

			results.push({
				id: recipe.id,
				name: recipe.name,
				instructions: recipe.instructions,
				matched_ingredients: matchedIngredients,
				matched_count: matchedCount,
				total_count: totalCount,
				missing_ingredients: missingIngredients,
				liked: interaction?.liked ?? false,
				made: isMade,
				image_url: recipe.image_url,
				allergen_warnings: allergenMatches.map((a) => a.name),
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
