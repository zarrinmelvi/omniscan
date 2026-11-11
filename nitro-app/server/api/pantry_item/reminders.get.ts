import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000

/**
 * GET /api/pantry_item/reminders
 *
 * Returns a lightweight list of active (non-archived, non-deleted) pantry
 * items that are expiring within the next 4 days. Each entry contains only
 * the fields the local-notification scheduler needs — no images, no
 * ingredient data — to keep the payload small.
 *
 * Response: { success: true, items: { id, name, date }[] }
 *   - `date` is the relevant expiry/best-before date as an ISO string.
 *   - Items with neither expiration_date nor best_before_date are excluded.
 */
export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	try {
		const now = new Date()
		const fourDaysFromNow = new Date(now.getTime() + FOUR_DAYS_MS)

		const items = await prisma.pantryItem.findMany({
			where: {
				user_id: authUser.id,
				deleted_at: null,
				is_archived: false,
				OR: [
					{ expiration_date: { gte: now, lte: fourDaysFromNow } },
					{ best_before_date: { gte: now, lte: fourDaysFromNow } },
				],
			},
			select: {
				id: true,
				expiration_date: true,
				best_before_date: true,
				product: {
					select: {
						product_name: true,
					},
				},
			},
		})

		// Map to { id, name, date } — date is whichever of
		// expiration_date / best_before_date is set (expiration_date takes
		// priority). Filter out items with no date at all.
		const reminders = items
			.map((item) => ({
				id: item.id,
				name: item.product.product_name,
				date: (item.expiration_date ?? item.best_before_date)?.toISOString() ?? null,
			}))
			.filter((r): r is { id: number; name: string; date: string } => r.date !== null)
			// Sort by expiry date ascending so the scheduler prioritises
			// the soonest-expiring items when the 60-reminder cap kicks in.
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

		return {
			success: true,
			items: reminders,
		}
	} catch (err: any) {
		console.error('Failed to fetch pantry reminders:', err)
		throw createError({
			statusCode: 400,
			statusMessage: 'Failed to fetch pantry reminders.',
		})
	}
})
