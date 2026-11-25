import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../../lib/prisma'
import { requireAdminAuth } from '../../../../utils/requireAdminAuth'

/**
 * POST /api/admin/users/:id/log-allergen-view
 * Writes an audit log entry when an admin views a consumer's allergens.
 * This endpoint MUST succeed before allergens are revealed (Ticket 2 fail-safe).
 * Returns { success: true, viewed_by: string, time_label: string } on success.
 * Throws on failure so the frontend knows to abort the reveal.
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const rawId = getRouterParam(event, 'id')
	const userId = rawId ? parseInt(rawId, 10) : NaN
	if (!userId || isNaN(userId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid user id.' })
	}

	const user = await prisma.user.findFirst({
		where: { id: userId, deleted_at: null },
		select: { id: true, name: true, username: true },
	})

	if (!user) {
		throw createError({ statusCode: 404, statusMessage: 'User not found.' })
	}

	const now = new Date()
	const timeLabel = now.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		timeZone: 'Asia/Manila',
	})

	const consumerHandle = user.username ? '@' + user.username : user.name
	const summary = admin.username + ' viewed ' + consumerHandle + "'s allergens"

	try {
		await prisma.auditEvent.create({
			data: {
				event_type: 'UPDATE',
				entity: 'User',
				entity_id: userId,
				triggered_by_admin_id: admin.id,
				summary,
				metadata: {
					action: 'VIEW_ALLERGENS',
					consumer_id: userId,
					consumer_handle: consumerHandle,
					admin_username: admin.username,
					viewed_at: now.toISOString(),
					time_label: timeLabel,
				},
			},
		})
	} catch (err) {
		console.error('[log-allergen-view] Failed to write audit event:', err)
		throw createError({
			statusCode: 500,
			statusMessage: 'Failed to record allergen view in System Logs. Allergens not revealed.',
		})
	}

	return {
		success: true,
		viewed_by: admin.username,
		time_label: timeLabel,
	}
})
