import { defineEventHandler } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

// server/api/notification/mark-all-read.put.ts — matches Figure 31's
// "Mark all read" link at the top of the Notifications screen.
export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const result = await prisma.notification.updateMany({
		where: { user_id: authUser.id, deleted_at: null, is_read: false },
		data: { is_read: true },
	})

	return { success: true, updated_count: result.count }
})
