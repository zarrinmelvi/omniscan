import { defineTask } from 'nitropack/runtime'
import { prisma } from '../../lib/prisma'
import { sendDailySummaryNotification } from '../../utils/email'

const DAY_MS = 24 * 60 * 60 * 1000

export default defineTask({
	meta: {
		name: 'notifications:daily-summary',
		description:
			'Compiles the flagged scans created in the last 24 hours into a daily summary and emails it to the admin (gated by the Daily Summary Report admin setting).',
	},
	async run() {
		const now = new Date()
		const since = new Date(now.getTime() - DAY_MS)

		const flags = await prisma.flaggedScan.findMany({
			where: { created_at: { gte: since } },
			orderBy: { created_at: 'desc' },
			select: {
				flag_reason: true,
				status: true,
				scan: {
					select: {
						safety_verdict: true,
						product: { select: { product_name: true } },
					},
				},
			},
		})

		const totalFlags = flags.length

		const byStatus = { pending: 0, approved: 0, dismissed: 0, other: 0 }
		for (const f of flags) {
			switch (f.status) {
				case 'pending':
					byStatus.pending++
					break
				case 'approved':
					byStatus.approved++
					break
				case 'dismissed':
					byStatus.dismissed++
					break
				default:
					byStatus.other++
					break
			}
		}

		const topFlags = flags.slice(0, 10).map((f) => ({
			productName: f.scan?.product?.product_name ?? 'Unknown product',
			flagReason: f.flag_reason,
			verdict: f.scan?.safety_verdict ?? null,
		}))

		const periodLabel = `${since.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`

		const emailResult = await sendDailySummaryNotification({ periodLabel, totalFlags, byStatus, topFlags })

		console.log(
			`[notifications:daily-summary] ${totalFlags} new flag(s) for ${periodLabel} (pending=${byStatus.pending}, approved=${byStatus.approved}, dismissed=${byStatus.dismissed}, other=${byStatus.other}). Emailed: ${emailResult.success}${emailResult.error ? ` (${emailResult.error})` : ''}.`
		)

		return { result: 'success', totalFlags, emailed: emailResult.success, reason: emailResult.error ?? null }
	},
})
