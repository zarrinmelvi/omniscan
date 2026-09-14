import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

interface UnmakeRecipeBody {
	recipe_id?: number
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)
	const body = (await readBody(event).catch(() => null)) as UnmakeRecipeBody | null
	const recipeId = body?.recipe_id

	if (!recipeId || typeof recipeId !== 'number') {
		throw createError({ statusCode: 400, statusMessage: 'A valid recipe_id is required.' })
	}

	try {
		// Clear made_at timestamp in database
		const interaction = await prisma.recipeInteraction.update({
			where: { user_id_recipe_id: { user_id: authUser.id, recipe_id: recipeId } },
			data: { made_at: null },
			select: { liked: true },
		})

		return {
			success: true,
			recipe_id: recipeId,
			made: false,
			liked: interaction.liked,
		}
	} catch (err: any) {
		console.error('Failed to unmark recipe as made:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to remove recipe from Made list.' })
	}
})