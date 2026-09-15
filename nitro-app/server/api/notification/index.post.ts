import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)
	const body = await readBody(event)

	if (!body.type || !body.message) {
		throw createError({ statusCode: 400, statusMessage: 'Type and message are required.' })
	}

	const notification = await prisma.notification.create({
		data: {
			user_id: authUser.id,
			type: body.type, // 'expiring', 'recipe_suggestion', 'recipe_idea', or 'pantry_match'
			message: body.message,
			is_read: false,
		},
	})

	return {
		success: true,
		notification: {
			...notification,
			created_at: notification.created_at.toISOString(),
		},
	}
})