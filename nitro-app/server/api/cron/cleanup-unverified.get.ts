// Cleanup Endpoint: Delete unverified accounts older than 7 days.
//
// Schedule this endpoint to run daily via an external cron scheduler:
//   - Vercel Cron Jobs: add to vercel.json under "crons"
//       { "path": "/api/cron/cleanup-unverified", "schedule": "0 2 * * *" }
//   - Or use a service like cron-job.org to call it with the CRON_SECRET header.
//
// Authorization: Bearer <CRON_SECRET> header required (matches check-expiring pattern).

import { defineEventHandler, createError, getHeader } from 'h3'
import { prisma } from '../../lib/prisma'

const UNVERIFIED_EXPIRY_DAYS = 7

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
	}

	const cutoff = new Date()
	cutoff.setDate(cutoff.getDate() - UNVERIFIED_EXPIRY_DAYS)

	// Find accounts to delete first so we can log them for audit purposes
	const accountsToDelete = await prisma.user.findMany({
		where: {
			email_verified: false,
			created_at: { lt: cutoff },
		},
		select: { id: true, email: true, created_at: true },
	})

	if (accountsToDelete.length === 0) {
		console.log('[cleanup-unverified] No expired unverified accounts to delete.')
		return { result: 'success', deleted: 0 }
	}

	console.log(`[cleanup-unverified] Deleting ${accountsToDelete.length} unverified account(s) older than ${UNVERIFIED_EXPIRY_DAYS} days:`)
	for (const account of accountsToDelete) {
		console.log(`  - id=${account.id} email=${account.email} registeredAt=${account.created_at.toISOString()}`)
	}

	const userIds = accountsToDelete.map((u) => u.id)

	// Delete related DietaryProfile records first to satisfy foreign key constraints
	await prisma.dietaryProfile.deleteMany({
		where: { user_id: { in: userIds } },
	})

	const deleted = await prisma.user.deleteMany({
		where: { id: { in: userIds } },
	})

	console.log(`[cleanup-unverified] Deleted ${deleted.count} unverified account(s).`)

	return { result: 'success', deleted: deleted.count }
})
