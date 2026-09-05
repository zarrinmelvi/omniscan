// server/tasks/notifications/check-expiring.ts
// Nitro derives the task name from the folder/file path, joined with ':' —
// this file becomes task "notifications:check-expiring", matching the
// scheduledTasks entry in nitro.config.ts.
import { defineTask } from 'nitropack/runtime'
import { prisma } from '../../lib/prisma'

const EXPIRING_WINDOW_DAYS = 4
const WINDOW_MS = EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function daysUntil(date: Date, now: Date): number {
	const diffMs = date.getTime() - now.getTime()
	return Math.max(0, Math.ceil(diffMs / DAY_MS))
}

export default defineTask({
	meta: {
		name: 'notifications:check-expiring',
		description:
			"Auto-archives pantry items that have already expired, then creates 'expiring soon' notifications for items still within the warning window.",
	},
	async run() {
		const now = new Date()
		const windowEnd = new Date(now.getTime() + WINDOW_MS)

		// --- Step 1: auto-archive anything already past its date ---
		// Matches the proposal's own Figure 13 caption ("automatically archiving
		// expired products") — previously this task only ever *notified* about
		// expiring items and never actually archived them once expired, so
		// expired items sat in the Active list indefinitely until a user
		// manually archived them.
		const expiredItems = await prisma.pantryItem.findMany({
			where: {
				deleted_at: null,
				is_archived: false,
				OR: [{ expiration_date: { lt: now } }, { best_before_date: { lt: now } }],
			},
			include: {
				product: { select: { id: true, product_name: true } },
			},
		})

		let archivedCount = 0

		for (const item of expiredItems) {
			await prisma.pantryItem.update({
				where: { id: item.id },
				data: { is_archived: true },
			})

			// Mirrors the "consumed" ActivityLog entry make.post.ts already
			// creates — same log, different type, so the archive/activity
			// history stays consistent regardless of *why* an item left the
			// active pantry (used in a recipe vs. simply expired).
			await prisma.activityLog.create({
				data: {
					type: 'expired',
					message: item.product.product_name,
					user_id: item.user_id,
					product_id: item.product.id,
					pantry_item_id: item.id,
				},
			})

			archivedCount++
		}

		if (archivedCount > 0) {
			console.log(`[notifications:check-expiring] Auto-archived ${archivedCount} expired pantry item(s).`)
		}

		// --- Step 2: notify about what's still upcoming (unchanged logic) ---
		// Items just archived above are already excluded here (is_archived:
		// false in the query), so nothing gets both archived AND a fresh
		// "expiring soon" notification in the same run.
		const expiringItems = await prisma.pantryItem.findMany({
			where: {
				deleted_at: null,
				is_archived: false,
				OR: [{ expiration_date: { gte: now, lte: windowEnd } }, { best_before_date: { gte: now, lte: windowEnd } }],
			},
			include: {
				product: { select: { id: true, product_name: true } },
			},
		})

		let createdCount = 0

		for (const item of expiringItems) {
			// Skip if we've already notified about this specific pantry item —
			// otherwise this job would create a fresh duplicate notification
			// every single day the item stays inside the window.
			// NOTE: relies on Notification.pantry_item_id (added in schema.prisma
			// alongside this task — Notification previously had no FK back to
			// the pantry item it concerned).
			const alreadyNotified = await prisma.notification.findFirst({
				where: {
					pantry_item_id: item.id,
					type: 'expiring_soon',
					deleted_at: null,
				},
			})

			if (alreadyNotified) continue

			const relevantDate = item.expiration_date ?? item.best_before_date
			if (!relevantDate) continue

			const days = daysUntil(relevantDate, now)
			const dayLabel = days <= 1 ? 'in 1 day' : `in ${days} days`

			await prisma.notification.create({
				data: {
					user_id: item.user_id,
					type: 'expiring_soon',
					message: `${item.product.product_name} expires ${dayLabel}. Use it before it goes to waste!`,
					pantry_item_id: item.id,
					product_id: item.product.id,
				},
			})

			createdCount++
		}

		console.log(`[notifications:check-expiring] Created ${createdCount} notification(s) for ${expiringItems.length} expiring item(s) checked.`)

		return { result: 'success', archived: archivedCount, created: createdCount, checked: expiringItems.length }
	},
})
