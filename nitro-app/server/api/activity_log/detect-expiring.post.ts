import { defineEventHandler, getHeader, createError } from 'h3'
import { prisma } from '../../lib/prisma'

// server/api/internal/detect-expiring.post.ts
//
// Not user-facing. Call this once a day from whatever scheduler you have
// available (Nitro's scheduledTasks config if your host supports it, an
// external cron service like cron-job.org or GitHub Actions, or manually
// while testing) — e.g.:
//   curl -X POST https://yourapp.com/api/internal/detect-expiring \
//        -H "x-cron-secret: $CRON_SECRET"
//
// Protected by a shared secret (set CRON_SECRET in your environment) since
// it has no user session to authenticate against — it runs for every user
// at once, not on behalf of a single logged-in caller.
//
// Idempotent: if a pantry item already has an 'expiring' ActivityLog row,
// both the activity feed AND notification writes are skipped for it, so
// running this multiple times (or more than once a day) won't spam
// duplicate entries into either feed.
//
// NOTE: 'expiring' is currently the only Notification type with a real
// trigger. Figure 31's mockup also shows "New Recipe Suggestion", "Recipe
// Idea", and "Pantry Recipe Match" notification types — those depend on
// the Recipes feature, which isn't built yet, so they won't appear here
// until that ships.

const EXPIRING_SOON_THRESHOLD_DAYS = 3 // keep in sync with HomePage.vue

export default defineEventHandler(async (event) => {
	const providedSecret = getHeader(event, 'x-cron-secret')
	const expectedSecret = process.env.CRON_SECRET

	if (!expectedSecret) {
		throw createError({ statusCode: 500, statusMessage: 'CRON_SECRET is not configured on the server.' })
	}

	if (!providedSecret || providedSecret !== expectedSecret) {
		throw createError({ statusCode: 401, statusMessage: 'Invalid or missing cron secret.' })
	}

	try {
		const now = new Date()
		const windowEnd = new Date(now.getTime() + EXPIRING_SOON_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

		const candidates = await prisma.pantryItem.findMany({
			where: {
				is_archived: false,
				deleted_at: null,
				OR: [
					{ expiration_date: { gte: now, lte: windowEnd } },
					{ AND: [{ expiration_date: null }, { best_before_date: { gte: now, lte: windowEnd } }] },
				],
			},
			include: {
				product: { select: { id: true, product_name: true } },
			},
		})

		let createdCount = 0

		for (const item of candidates) {
			const alreadyLogged = await prisma.activityLog.findFirst({
				where: { type: 'expiring', pantry_item_id: item.id },
			})

			if (alreadyLogged) continue

			await prisma.$transaction([
				prisma.activityLog.create({
					data: {
						type: 'expiring',
						message: item.product.product_name,
						user_id: item.user_id,
						product_id: item.product.id,
						pantry_item_id: item.id,
					},
				}),
				prisma.notification.create({
					data: {
						type: 'expiring',
						message: `${item.product.product_name} is expiring soon. Use it before it goes to waste!`,
						user_id: item.user_id,
					},
				}),
			])

			createdCount += 1
		}

		return {
			success: true,
			checked: candidates.length,
			created: createdCount,
		}
	} catch (err: any) {
		console.error('Failed to detect expiring pantry items:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to detect expiring pantry items.' })
	}
})
