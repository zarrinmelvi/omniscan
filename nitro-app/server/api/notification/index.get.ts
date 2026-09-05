import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)
	const query = getQuery(event)

	const requestedLimit = Number(query.limit)
	const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT

	const [notifications, unreadCount] = await Promise.all([
		prisma.notification.findMany({
			where: { user_id: authUser.id, deleted_at: null },
			orderBy: { created_at: 'desc' },
			take: limit,
			select: {
				id: true,
				type: true,
				message: true,
				is_read: true,
				created_at: true,
			},
		}),
		prisma.notification.count({
			where: { user_id: authUser.id, deleted_at: null, is_read: false },
		}),
	])

	return {
		success: true,
		unread_count: unreadCount,
		notifications: notifications.map((n) => ({
			...n,
			created_at: n.created_at.toISOString(),
		})),
	}
})
