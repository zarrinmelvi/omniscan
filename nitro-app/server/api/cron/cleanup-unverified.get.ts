// Cleanup Endpoint: deletes unverified, non-Google accounts older than 7 days.
//
// Scheduled daily via Vercel Cron Jobs (vercel.json):
//   { "path": "/api/cron/cleanup-unverified", "schedule": "0 8 * * *" }
//
// Authorization: Bearer <CRON_SECRET> header required.
// No email is sent (these users never verified their address).

import { defineEventHandler, createError, getHeader } from 'h3'
import { prisma } from '../../lib/prisma'
import {
	getUnverifiedCutoff,
	selectUnverifiedAccountsForDeletion,
} from '../../lib/unverified-cleanup'

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
	}

	const now = new Date()

	const candidates = await prisma.user.findMany({
		where: {
			email_verified: false,
			oauth_provider: null,
			created_at: { lt: getUnverifiedCutoff(now) },
		},
		select: { id: true, email_verified: true, oauth_provider: true, created_at: true },
	})

	// Re-apply the pure predicate as a safety net
	const toDelete = selectUnverifiedAccountsForDeletion(candidates, now)

	let deletedUsersCount = 0
	if (toDelete.length > 0) {
		const userIds = toDelete.map((u) => u.id)

		// Child relations first to avoid foreign key violations
		await prisma.$transaction(async (tx) => {
			await tx.activityLog.deleteMany({ where: { user_id: { in: userIds } } })
			await tx.notification.deleteMany({ where: { user_id: { in: userIds } } })
			await tx.dietaryProfile.deleteMany({ where: { user_id: { in: userIds } } })
			await tx.pantryItem.deleteMany({ where: { user_id: { in: userIds } } })
			await tx.recipeInteraction.deleteMany({ where: { user_id: { in: userIds } } })

			const userScans = await tx.scan.findMany({
				where: { user_id: { in: userIds } },
				select: { id: true },
			})
			if (userScans.length > 0) {
				const scanIds = userScans.map((s) => s.id)
				await tx.flaggedScan.deleteMany({ where: { scan_id: { in: scanIds } } })
				await tx.scan.deleteMany({ where: { user_id: { in: userIds } } })
			}

			const deleted = await tx.user.deleteMany({ where: { id: { in: userIds } } })
			deletedUsersCount = deleted.count
		})

		console.log(`[cleanup-unverified] Deleted ${deletedUsersCount} unverified account(s).`)
	}

	return {
		result: 'success',
		deletedUnverifiedUsers: deletedUsersCount,
	}
})
