import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { matchIngredientsToPantry, type RawIngredient } from '../../lib/recipe-matching'

// Unlike suggest.get.ts, this isn't a pantry-driven search — it's just
// "recipes this user has liked," full stop. Deliberately does not re-run the
// allergen/Halal exclusion suggest.get.ts applies: liking something is a
// user choice being listed back to them, not a new suggestion being made, so
// this doesn't hide a previously-liked recipe just because the user's
// profile changed since. Missing-ingredient info against the *current*
// pantry is still computed, purely for consistent card display with the
// other tabs.
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
		const [interactions, pantryItems] = await Promise.all([
			prisma.recipeInteraction.findMany({
				where: { user_id: authUser.id, liked: true },
				orderBy: { updated_at: 'desc' },
				select: {
					made_at: true,
					recipe: { select: { id: true, name: true, instructions: true, raw_ingredients: true, image_url: true } },
				},
			}),
			prisma.pantryItem.findMany({
				where: { user_id: authUser.id, is_archived: false },
				select: { id: true, product: { select: { product_name: true } } },
			}),
		])

		if (interactions.length === 0) {
			return { success: true, recipes: [], message: "You haven't liked any recipes yet." }
		}

		// Deduplicate interactions by recipe ID to guarantee unique records
		const uniqueInteractionsMap = new Map<number, (typeof interactions)[number]>()
		for (const interaction of interactions) {
			if (!uniqueInteractionsMap.has(interaction.recipe.id)) {
				uniqueInteractionsMap.set(interaction.recipe.id, interaction)
			}
		}
		const uniqueInteractions = Array.from(uniqueInteractionsMap.values())

		const pantryProducts = pantryItems.map((p) => ({ id: p.id, product_name: p.product.product_name }))

		const results = uniqueInteractions.map(({ recipe, made_at }) => {
			const ingredients = coerceRawIngredients(recipe.raw_ingredients)
			const { matchedIngredients, missingIngredients } = matchIngredientsToPantry(ingredients, pantryProducts)

			return {
				id: recipe.id,
				name: recipe.name,
				instructions: recipe.instructions,
				matched_ingredients: matchedIngredients,
				matched_count: matchedIngredients.length,
				total_count: ingredients.length,
				missing_ingredients: missingIngredients,
				liked: true,
				made: made_at !== null,
				image_url: recipe.image_url,
			}
		})

		return { success: true, recipes: results }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch liked recipes:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch liked recipes.' })
	}
})