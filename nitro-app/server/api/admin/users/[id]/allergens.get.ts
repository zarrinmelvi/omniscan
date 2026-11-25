import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../../lib/prisma'
import { requireAdminAuth } from '../../../../utils/requireAdminAuth'

/**
 * GET /api/admin/users/:id/allergens
 * Returns the consumer's declared allergen names.
 * Called ONLY after the audit log has been written successfully (Ticket 2 fail-safe).
 * Never included in the initial modal payload (Ticket 1).
 */
export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const rawId = getRouterParam(event, 'id')
	const userId = rawId ? parseInt(rawId, 10) : NaN
	if (!userId || isNaN(userId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid user id.' })
	}

	const user = await prisma.user.findFirst({
		where: { id: userId, deleted_at: null },
		select: { allergens: { select: { id: true, name: true } } },
	})

	if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found.' })

	return {
		success: true,
		allergens: user.allergens.map((a) => a.name),
	}
})
