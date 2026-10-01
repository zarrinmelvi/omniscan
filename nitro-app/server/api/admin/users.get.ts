import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

// Account lifecycle thresholds (in days), matching the policy shown in the
// admin UI:
//   0–29 days inactive    -> Active
//   30–179 days inactive  -> Inactive
//   180+ days inactive    -> Archived
//   187+ days inactive    -> Archived + deletion-due flag (1 week past archive)
const INACTIVE_AFTER_DAYS = 30
const ARCHIVE_AFTER_DAYS = 180
const DELETE_AFTER_DAYS = 187

type LifecycleStatus = 'Active' | 'Inactive' | 'Archived'

function daysBetween(from: Date, to: Date): number {
	const ms = to.getTime() - from.getTime()
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

/**
 * Derives the lifecycle status purely from last-active recency, so the admin
 * view always reflects the automated policy rather than a possibly-stale
 * stored status. An explicitly stored 'archived' status is always honoured
 * (an admin/cron may have archived early), but recency can still promote a
 * row to Archived even if the stored status lags behind.
 */
function deriveStatus(storedStatus: string, inactiveDays: number): LifecycleStatus {
	const stored = (storedStatus || '').toLowerCase()
	if (stored === 'archived') return 'Archived'
	if (inactiveDays >= ARCHIVE_AFTER_DAYS) return 'Archived'
	if (inactiveDays >= INACTIVE_AFTER_DAYS) return 'Inactive'
	return 'Active'
}

/** Human-readable "inactive for" label, e.g. "3d", "1mo 14d", "6mo 10d". */
function formatInactiveFor(days: number): string | null {
	if (days <= 0) return null
	if (days < 30) return `${days}d`
	const months = Math.floor(days / 30)
	const remDays = days % 30
	return remDays > 0 ? `${months}mo ${remDays}d` : `${months}mo`
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	try {
		const now = new Date()

		const users = await prisma.user.findMany({
			where: { deleted_at: null },
			orderBy: { created_at: 'asc' },
			select: {
				id: true,
				name: true,
				email: true,
				status: true,
				last_active: true,
				created_at: true,
				avatar_base64: true,
				_count: { select: { scan: true } },
			},
		})

		const rows = users.map((u) => {
			const lastActive = u.last_active ?? u.created_at
			const inactiveDays = daysBetween(lastActive, now)
			const status = deriveStatus(u.status, inactiveDays)
			const deletionDue = status === 'Archived' && inactiveDays >= DELETE_AFTER_DAYS

			return {
				id: u.id,
				name: u.name,
				email: u.email,
				avatar_base64: u.avatar_base64 ?? null,
				created_at: u.created_at,
				last_active: lastActive,
				inactive_days: inactiveDays,
				inactive_for: formatInactiveFor(inactiveDays),
				status,
				deletion_due: deletionDue,
				scan_count: u._count.scan,
			}
		})

		const stats = {
			total: rows.length,
			active: rows.filter((r) => r.status === 'Active').length,
			inactive: rows.filter((r) => r.status === 'Inactive').length,
			archived: rows.filter((r) => r.status === 'Archived').length,
		}

		return { success: true, users: rows, stats }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch admin users:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch users.' })
	}
})
