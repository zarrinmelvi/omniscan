import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

// server/api/notification/[id].put.ts — marks a single notification as read.
export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const idParam = getRouterParam(event, 'id')
	const notificationId = Number(idParam)

	if (!idParam || isNaN(notificationId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid notification id is required.' })
	}

	const existing = await prisma.notification.findUnique({ where: { id: notificationId } })

	if (!existing || existing.deleted_at) {
		throw createError({ statusCode: 404, statusMessage: 'Notification not found.' })
	}
	if (existing.user_id !== authUser.id) {
		throw createError({ statusCode: 403, statusMessage: 'You do not have access to this notification.' })
	}

	const updated = await prisma.notification.update({
		where: { id: notificationId },
		data: { is_read: true },
	})

	return { success: true, notification: { ...updated, created_at: updated.created_at.toISOString() } }
})
