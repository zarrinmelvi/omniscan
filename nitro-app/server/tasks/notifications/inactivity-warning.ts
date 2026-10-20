import { defineTask } from 'nitropack/runtime'
import { prisma } from '../../lib/prisma'
import { sendInactivityWarningEmail } from '../../utils/email'

const INACTIVITY_WARNING_DAYS = 30

export default defineTask({
	meta: {
		name: 'notifications:inactivity-warning',
		description:
			'Finds ACTIVE users who have been inactive for 30+ days and have not yet been warned in this inactivity cycle. Sends a one-time warning email + in-app notification and stamps inactivity_warning_sent_at so it does not resend daily.',
	},
	async run() {
		const now = new Date()
		const cutoff = new Date(now.getTime() - INACTIVITY_WARNING_DAYS * 24 * 60 * 60 * 1000)

		// Candidates: ACTIVE and inactive >= 30 days. We intentionally avoid a
		// Prisma field-reference comparison (inactivity_warning_sent_at vs
		// last_active) in the where-clause since it isn't supported across all
		// Prisma versions. Instead we filter the "already warned this cycle"
		// condition in JS inside the loop below.
		const candidates = await prisma.user.findMany({
			where: {
				status: 'ACTIVE',
				last_active: { lt: cutoff },
			},
			select: { id: true, name: true, email: true, last_active: true, inactivity_warning_sent_at: true },
		})

		let warnedCount = 0
		for (const user of candidates) {
			// Skip if a warning was already sent AFTER the last_active (i.e. we
			// already warned in this quiet cycle). Only warn again once the user
			// has logged back in (which resets inactivity_warning_sent_at to null)
			// and then gone quiet again.
			if (user.inactivity_warning_sent_at && user.last_active && user.inactivity_warning_sent_at >= user.last_active) {
				continue
			}

			const emailResult = await sendInactivityWarningEmail(user.email, user.name)

			// In-app notification regardless of email outcome (email is best-effort)
			await prisma.notification.create({
				data: {
					user_id: user.id,
					type: 'inactivity_warning',
					message: 'Your account has been inactive for a while. Sign in to keep it active.',
					is_read: false,
				},
			}).catch((err) => console.error('[inactivity-warning] notification create failed (non-blocking):', err))

			await prisma.user.update({
				where: { id: user.id },
				data: { inactivity_warning_sent_at: now },
			})

			warnedCount++
			console.log(`[notifications:inactivity-warning] Warned user id=${user.id} email=${user.email} (emailed=${emailResult.success})`)
		}

		console.log(`[notifications:inactivity-warning] Processed ${candidates.length} candidate(s), warned ${warnedCount}.`)
		return { result: 'success', candidates: candidates.length, warned: warnedCount }
	},
})
