import { defineTask } from 'nitropack/runtime'
import { prisma } from '../../lib/prisma'
import { sendMonthlyLogoCheckNotification } from '../../utils/email'

const OVERDUE_DAYS = 30

export default defineTask({
	meta: {
		name: 'notifications:monthly-logo-check',
		description:
			'Checks all active Halal logos and emails the admin a list of any that have not been verified in the last 30 days or have never been checked.',
	},
	async run({ payload }: { payload?: Record<string, unknown> }) {
		const force = payload?.force === true || payload?.force === 'true' || payload?.force === '1'
		const now = new Date()
		const overdueThreshold = new Date(now.getTime() - OVERDUE_DAYS * 24 * 60 * 60 * 1000)

		const activeLogos = await prisma.halalLogo.findMany({
			where: { is_active: true },
			select: {
				id: true,
				certifier: true,
				full_name: true,
				country: true,
				last_checked_at: true,
			},
			orderBy: { certifier: 'asc' },
		})

		const overdueLogos = activeLogos.filter(
			(l) => l.last_checked_at === null || l.last_checked_at < overdueThreshold,
		)

		const totalActive = activeLogos.length
		const overdueCount = overdueLogos.length

		console.log(
			`[notifications:monthly-logo-check] ${overdueCount}/${totalActive} active logo(s) overdue. forced=${force}`,
		)

		const emailResult = await sendMonthlyLogoCheckNotification({
			overdueCount,
			totalActive,
			overdueLogos,
		})

		console.log(
			`[notifications:monthly-logo-check] Email sent: ${emailResult.success}${emailResult.error ? ` (${emailResult.error})` : ''}`,
		)

		return {
			result: 'success',
			totalActive,
			overdueCount,
			emailed: emailResult.success,
			reason: emailResult.error ?? null,
			forced: force,
		}
	},
})
