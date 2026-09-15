import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { matchIngredientsToPantry, type RawIngredient } from '../../lib/recipe-matching'

// Mirrors liked.get.ts's approach – "recipes this user has made," ordered
// most-recent-first by when they last made it. No allergen/Halal
// re-filtering here either, for the same reason: this is a history list,
// not a fresh suggestion.
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
				where: { user_id: authUser.id, made_at: { not: null } },
				orderBy: { made_at: 'desc' },
				select: {
					liked: true,
					recipe: { select: { id: true, name: true, instructions: true, raw_ingredients: true } },
				},
			}),
			prisma.pantryItem.findMany({
				where: { user_id: authUser.id, is_archived: false },
				select: { id: true, product: { select: { product_name: true } } },
			}),
		])

		if (interactions.length === 0) {
			return { success: true, recipes: [], message: "You haven't made any recipes yet." }
		}

		const pantryProducts = pantryItems.map((p) => ({ id: p.id, product_name: p.product.product_name }))

		const results = interactions.map(({ recipe, liked }) => {
			const ingredients = coerceRawIngredients(recipe.raw_ingredients)
			const { matchedIngredientNames, missingIngredientNames } = matchIngredientsToPantry(ingredients, pantryProducts)

			return {
				id: recipe.id,
				name: recipe.name,
				instructions: recipe.instructions,
				matched_ingredients: matchedIngredientNames, // FIXED: Attached matched ingredients array
				matched_count: matchedIngredientNames.length,
				total_count: ingredients.length,
				missing_ingredients: missingIngredientNames,
				liked,
				made: true,
			}
		})

		return { success: true, recipes: results }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch made recipes:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch made recipes.' })
	}
})