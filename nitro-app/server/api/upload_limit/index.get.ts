import { defineEventHandler } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const startOfToday = new Date()
	startOfToday.setHours(0, 0, 0, 0)

	// Count ONLY manual photo uploads today (filtering by brand_name 'Manually Added')
	const todayManualUploadsCount = await prisma.pantryItem.count({
		where: {
			user_id: authUser.id,
			created_at: { gte: startOfToday },
			product: {
				brand_name: 'Manually Added',
			},
		},
	})

	const DAILY_MAX = 7
	const remaining = Math.max(0, DAILY_MAX - todayManualUploadsCount)

	return {
		remaining,
		daily_limit: DAILY_MAX,
	}
})