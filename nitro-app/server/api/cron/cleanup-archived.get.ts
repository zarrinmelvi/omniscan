// Cleanup Endpoint: Handles Account Lifecycle Policy & Pantry Item Cleanup
//
// Schedule this endpoint to run daily via Vercel Cron Jobs (vercel.json):
//   { "path": "/api/cron/cleanup-archived", "schedule": "0 8 * * *" }
//
// Authorization: Bearer <CRON_SECRET> header required.

import { defineEventHandler, createError, getHeader } from 'h3'
import { prisma } from '../../lib/prisma'
import { sendAccountArchivedEmail, sendAccountDeletedEmail } from '../../utils/email'

const ARCHIVED_RETENTION_DAYS = 7
const INACTIVE_ARCHIVE_DAYS = 180
const NOTIFICATION_RETENTION_DAYS = 7

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
	}

	const now = new Date()

	// =========================================================================
	// 0. NOTIFICATION CLEANUP — hard-delete notifications older than 7 days.
	//    Notifications are transient; rows are removed entirely (not soft-deleted).
	// =========================================================================
	const notifCutoff = new Date(now)
	notifCutoff.setDate(notifCutoff.getDate() - NOTIFICATION_RETENTION_DAYS)
	const deletedNotificationsResult = await prisma.notification.deleteMany({
		where: { created_at: { lt: notifCutoff } },
	})
	const deletedNotificationCount = deletedNotificationsResult.count
	if (deletedNotificationCount > 0) {
		console.log(`[cleanup-archived] Hard-deleted ${deletedNotificationCount} notification(s) older than ${NOTIFICATION_RETENTION_DAYS} days.`)
	}

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
		// Conditional update guards against double-archiving (and duplicate emails)
		const result = await prisma.user.updateMany({
			where: { id: user.id, status: 'ACTIVE' },
			data: { status: 'ARCHIVED', archived_at: now },
		})
		if (result.count !== 1) continue
		archivedUsersCount++

		// Send warning email (1-week grace period to log back in)
		try {
			await sendAccountArchivedEmail(user.email, user.name)
		} catch (err) {
			console.error('[cleanup-archived] Failed to send archive email:', err)
		}
	}

	if (archivedUsersCount > 0) {
		console.log(`[cleanup-archived] Archived ${archivedUsersCount} inactive user(s) and sent warning emails.`)
	}

	// =========================================================================
	// 3. ACCOUNT LIFECYCLE: +1 WEEK AFTER ARCHIVE -> PERMANENTLY DELETED
	// =========================================================================
	const deleteUserCutoff = new Date()
	deleteUserCutoff.setDate(deleteUserCutoff.getDate() - ARCHIVED_RETENTION_DAYS)

	// Finds users archived 7+ days ago (null archived_at never matches)
	const usersToDelete = await prisma.user.findMany({
		where: {
			status: 'ARCHIVED',
			archived_at: { lt: deleteUserCutoff },
		},
		select: { id: true, name: true, email: true },
	})
	// Capture recipients before the rows are removed
	const deletedRecipients = usersToDelete.map((u) => ({ email: u.email, name: u.name }))

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

		// Transaction committed: notify each deleted user (failures are isolated)
		for (const recipient of deletedRecipients) {
			try {
				await sendAccountDeletedEmail(recipient.email, recipient.name)
			} catch (err) {
				console.error('[cleanup-archived] Failed to send deletion email:', err)
			}
		}
	}

	return {
		result: 'success',
		deletedNotifications: deletedNotificationCount,
		deletedPantryItems: deletedPantryCount,
		archivedUsers: archivedUsersCount,
		deletedUsers: deletedUsersCount,
	}
})