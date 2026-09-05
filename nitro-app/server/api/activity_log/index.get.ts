import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

const DEFAULT_LIMIT = 6
const MAX_LIMIT = 20

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)
	const query = getQuery(event)

	const requestedLimit = Number(query.limit)
	const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT

	const entries = await prisma.activityLog.findMany({
		where: { user_id: authUser.id },
		orderBy: { occurred_at: 'desc' },
		take: limit,
		select: {
			id: true,
			type: true,
			message: true,
			occurred_at: true,
			product_id: true,
			pantry_item_id: true,
		},
	})

	return {
		success: true,
		activities: entries.map((entry) => ({
			...entry,
			occurred_at: entry.occurred_at.toISOString(),
		})),
	}
})
