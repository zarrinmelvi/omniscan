// Cleanup Endpoint: Handles Account Lifecycle Policy & Pantry Item Cleanup
//
// Schedule this endpoint to run daily via Vercel Cron Jobs (vercel.json):
//   { "path": "/api/cron/cleanup-archived", "schedule": "0 8 * * *" }
//
// Authorization: Bearer <CRON_SECRET> header required.

import { defineEventHandler, createError, getHeader } from 'h3'
import { prisma } from '../../lib/prisma'
import { sendAccountArchivedEmail } from '../../utils/email'

const ARCHIVED_RETENTION_DAYS = 7
const INACTIVE_ARCHIVE_DAYS = 180

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
	}

	const now = new Date()

	// =========================================================================
	// 1. PANTRY ITEM CLEANUP
	// =========================================================================
	const pantryCutoff = new Date()
	pantryCutoff.setDate(pantryCutoff.getDate() - ARCHIVED_RETENTION_DAYS)

	const itemsToDelete = await prisma.pantryItem.findMany({
		where: {
			is_archived: true,
			deleted_at: null,
			updated_at: { lt: pantryCutoff },
		},
		select: { id: true },
	})

	let deletedPantryCount = 0
	if (itemsToDelete.length > 0) {
		const ids = itemsToDelete.map((item) => item.id)
		const deleted = await prisma.pantryItem.updateMany({
			where: { id: { in: ids } },
			data: { deleted_at: now },
		})
		deletedPantryCount = deleted.count
		console.log(`[cleanup-archived] Soft-deleted ${deletedPantryCount} archived pantry item(s).`)
	}

	// =========================================================================
	// 2. ACCOUNT LIFECYCLE: 6 MONTHS INACTIVE -> ARCHIVED (+ EMAIL WARNING)
	// =========================================================================
	const archiveCutoff = new Date()
	archiveCutoff.setDate(archiveCutoff.getDate() - INACTIVE_ARCHIVE_DAYS)

	const usersToArchive = await prisma.user.findMany({
		where: {
			status: 'ACTIVE',
			last_active: { lt: archiveCutoff },
		},
		select: { id: true, name: true, email: true },
	})

	let archivedUsersCount = 0
	for (const user of usersToArchive) {
		await prisma.user.update({
			where: { id: user.id },
			data: { status: 'ARCHIVED' },
		})
		archivedUsersCount++

		// Send warning email (1-week grace period to log back in)
		await sendAccountArchivedEmail(user.email, user.name)
	}

	if (archivedUsersCount > 0) {
		console.log(`[cleanup-archived] Archived ${archivedUsersCount} inactive user(s) and sent warning emails.`)
	}

	// =========================================================================
	// 3. ACCOUNT LIFECYCLE: +1 WEEK AFTER ARCHIVE -> PERMANENTLY DELETED
	// =========================================================================
	const deleteUserCutoff = new Date()
	deleteUserCutoff.setDate(deleteUserCutoff.getDate() - ARCHIVED_RETENTION_DAYS)

	// Finds users whose status is ARCHIVED and were updated 7+ days ago
	const usersToDelete = await prisma.user.findMany({
		where: {
			status: 'ARCHIVED',
			updated_at: { lt: deleteUserCutoff },
		},
		select: { id: true, email: true },
	})

	let deletedUsersCount = 0
	if (usersToDelete.length > 0) {
		const userIdsToDelete = usersToDelete.map((u) => u.id)

		// Execute deletion inside a transaction to remove child relations first
		// (Prevents Foreign Key Constraint violations)
		await prisma.$transaction(async (tx) => {
			// Delete child relation records
			await tx.activityLog.deleteMany({ where: { user_id: { in: userIdsToDelete } } })
			await tx.notification.deleteMany({ where: { user_id: { in: userIdsToDelete } } })
			await tx.dietaryProfile.deleteMany({ where: { user_id: { in: userIdsToDelete } } })
			await tx.pantryItem.deleteMany({ where: { user_id: { in: userIdsToDelete } } })
			await tx.recipeInteraction.deleteMany({ where: { user_id: { in: userIdsToDelete } } })

			// Delete scans (and child FlaggedScans first if any exist)
			const userScans = await tx.scan.findMany({
				where: { user_id: { in: userIdsToDelete } },
				select: { id: true },
			})
			if (userScans.length > 0) {
				const scanIds = userScans.map((s) => s.id)
				await tx.flaggedScan.deleteMany({ where: { scan_id: { in: scanIds } } })
				await tx.scan.deleteMany({ where: { user_id: { in: userIdsToDelete } } })
			}

			// Delete users
			const deleted = await tx.user.deleteMany({
				where: { id: { in: userIdsToDelete } },
			})
			deletedUsersCount = deleted.count
		})

		console.log(`[cleanup-archived] Permanently deleted ${deletedUsersCount} archived user account(s).`)
	}

	return {
		result: 'success',
		deletedPantryItems: deletedPantryCount,
		archivedUsers: archivedUsersCount,
		deletedUsers: deletedUsersCount,
	}
})