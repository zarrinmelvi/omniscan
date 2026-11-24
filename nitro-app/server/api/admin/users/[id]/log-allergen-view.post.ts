import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../../lib/prisma'
import { requireAdminAuth } from '../../../../utils/requireAdminAuth'
import { logAuditEvent } from '../../../../lib/audit-logger'

/**
 * POST /api/admin/users/:id/log-allergen-view
 *
 * Called by the frontend whenever the admin clicks "Show Allergens" on a
 * consumer detail modal. Records who viewed which consumer's allergens and
 * when, so it appears in the System Logs audit trail.
 *
 * "Hide Allergens" is NOT logged (per spec decision).
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const rawId = getRouterParam(event, 'id')
	const userId = rawId ? parseInt(rawId, 10) : NaN
	if (isNaN(userId)) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid user id.' })
	}

	const user = await prisma.user.findFirst({
		where: { id: userId, deleted_at: null },
		select: { id: true, name: true },
	})

	if (!user) {
		throw createError({ statusCode: 404, statusMessage: 'User not found.' })
	}

	const now = new Date()
	const timeStr = now.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		timeZone: 'Asia/Manila',
	})

	await logAuditEvent({
		event_type: 'UPDATE',
		entity: 'User',
		entity_id: userId,
		triggered_by_admin_id: admin.id,
		summary: `Admin ${admin.username} viewed allergens for consumer ${user.name} (#${userId})`,
		metadata: {
			action: 'VIEW_ALLERGENS',
			consumer_id: userId,
			consumer_name: user.name,
			admin_username: admin.username,
			viewed_at: now.toISOString(),
			time_label: timeStr,
		},
	})

	return {
		success: true,
		viewed_by: admin.username,
		time_label: timeStr,
	}
})
