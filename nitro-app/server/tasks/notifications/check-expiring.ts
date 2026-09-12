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
