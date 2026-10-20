import { defineEventHandler } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { countActivePantryItems, MAX_ACTIVE_PANTRY_ITEMS } from '../../lib/quota'

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

	const activePantryItems = await countActivePantryItems(authUser.id)

	return {
		remaining,
		daily_limit: DAILY_MAX,
		active_pantry_items: activePantryItems,
		pantry_item_limit: MAX_ACTIVE_PANTRY_ITEMS,
		pantry_quota_remaining: Math.max(0, MAX_ACTIVE_PANTRY_ITEMS - activePantryItems),
	}
})