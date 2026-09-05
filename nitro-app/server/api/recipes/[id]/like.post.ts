import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../utils/requireAuth'

// Toggles the current user's "liked" status on a recipe. Upserts rather than
// requiring an existing row, since a user may like a recipe before ever
// making it (no RecipeInteraction row yet from /api/recipes/make). Only
// flips `liked` — never touches `made_at`, which is exclusively set by the
// make-recipe flow.
export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const recipeIdParam = getRouterParam(event, 'id')
	const recipeId = recipeIdParam ? Number(recipeIdParam) : NaN

	if (!recipeIdParam || Number.isNaN(recipeId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid recipe id is required in the URL.' })
	}

	try {
		const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { id: true } })
		if (!recipe) {
			throw createError({ statusCode: 404, statusMessage: 'Recipe not found.' })
		}

		const existing = await prisma.recipeInteraction.findUnique({
			where: { user_id_recipe_id: { user_id: authUser.id, recipe_id: recipeId } },
			select: { liked: true },
		})

		const nextLiked = !(existing?.liked ?? false)

		const interaction = await prisma.recipeInteraction.upsert({
			where: { user_id_recipe_id: { user_id: authUser.id, recipe_id: recipeId } },
			create: { user_id: authUser.id, recipe_id: recipeId, liked: nextLiked },
			update: { liked: nextLiked },
			select: { liked: true, made_at: true },
		})

		return {
			success: true,
			liked: interaction.liked,
			made: interaction.made_at !== null,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to toggle recipe like:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to update like status.' })
	}
})
