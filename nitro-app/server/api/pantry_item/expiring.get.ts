import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	try {
		const now = new Date()
		const threeDaysFromNow = new Date(now.getTime() + THREE_DAYS_MS)

		const expiringItems = await prisma.pantryItem.findMany({
			where: {
				user_id: authUser.id,
				deleted_at: null,
				expiration_date: {
					gte: now,
					lte: threeDaysFromNow,
				},
			},
			include: {
				product: {
					select: {
						id: true,
						brand_name: true,
						product_name: true,
						ingredient_text: true,
						simplified_ingredients: true,
					},
				},
			},
			orderBy: {
				expiration_date: 'asc',
			},
		})

		return {
			success: true,
			items: expiringItems,
		}
	} catch (err: any) {
		console.error('Failed to fetch expiring pantry items:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch expiring pantry items.' })
	}
})
