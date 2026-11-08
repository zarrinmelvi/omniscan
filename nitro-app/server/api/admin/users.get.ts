import { defineEventHandler, createError, getQuery } from 'h3'
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

const MS_PER_DAY = 1000 * 60 * 60 * 24

// Online = has a live session AND was active within this window.
const ONLINE_WINDOW_MS = 2 * 60 * 1000

type LifecycleStatus = 'Active' | 'Inactive' | 'Archived'

function daysBetween(from: Date, to: Date): number {
	const ms = to.getTime() - from.getTime()
	return Math.max(0, Math.floor(ms / MS_PER_DAY))
}

function deriveStatus(storedStatus: string, inactiveDays: number): LifecycleStatus {
	const stored = (storedStatus || '').toLowerCase()
	if (stored === 'archived') return 'Archived'
	if (inactiveDays >= ARCHIVE_AFTER_DAYS) return 'Archived'
	if (inactiveDays >= INACTIVE_AFTER_DAYS) return 'Inactive'
	return 'Active'
}

function formatInactiveFor(days: number): string | null {
	if (days <= 0) return null
	if (days < 30) return `${days}d`
	const months = Math.floor(days / 30)
	const remDays = days % 30
	return remDays > 0 ? `${months}mo ${remDays}d` : `${months}mo`
}

// Masks the local part of an email so admins never see full addresses:
//   "sei@gmail.com" -> "se•••@gmail.com"; malformed (no "@") -> original.
function maskEmail(email: string): string {
	if (!email || !email.includes('@')) return email || ''
	const [local, domain] = email.split('@')
	const keep = local.slice(0, 2)
	return `${keep}•••@${domain}`
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	try {
		const now = new Date()
		const q = getQuery(event)
		const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

		const pageSize = Math.min(100, Math.max(1, Math.floor(Number(q.pageSize)) || 10))
		const requestedPage = Math.max(1, Math.floor(Number(q.page)) || 1)
		const search = str(q.search)
		const sortKey = str(q.sort).toLowerCase()
		const statusKey = str(q.status).toLowerCase()

		// Lifecycle rules (same as deriveStatus above, expressed as Prisma conditions).
		// inactiveDays = floor((now - last_active) / day), so:
		//   >= N days inactive  <=>  last_active <= now - N days
		const cutoff = (days: number) => new Date(now.getTime() - days * MS_PER_DAY)
		const storedArchived = { status: { equals: 'archived', mode: 'insensitive' as const } }
		const storedNotArchived = { NOT: storedArchived }
		const activeCond = { AND: [storedNotArchived, { last_active: { gt: cutoff(INACTIVE_AFTER_DAYS) } }] }
		const inactiveCond = {
			AND: [
				storedNotArchived,
				{ last_active: { lte: cutoff(INACTIVE_AFTER_DAYS), gt: cutoff(ARCHIVE_AFTER_DAYS) } },
			],
		}
		const archivedCond = { OR: [storedArchived, { last_active: { lte: cutoff(ARCHIVE_AFTER_DAYS) } }] }

		const and: any[] = [{ deleted_at: null }]
		if (search) {
			and.push({
				OR: [
					{ name: { contains: search, mode: 'insensitive' } },
					{ username: { contains: search, mode: 'insensitive' } },
					{ email: { contains: search, mode: 'insensitive' } },
				],
			})
		}
		const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_MS)
		if (statusKey === 'online') {
			and.push({ session_token: { not: null }, last_active: { gte: onlineSince } })
		} else if (statusKey === 'offline') {
			and.push({ OR: [{ session_token: null }, { last_active: null }, { last_active: { lt: onlineSince } }] })
		}
		if (statusKey === 'active') and.push(activeCond)
		else if (statusKey === 'inactive') and.push(inactiveCond)
		else if (statusKey === 'archived') and.push(archivedCond)
		const where = { AND: and }

		const direction = sortKey === 'oldest' ? 'asc' : 'desc'

		const [total, lcActive, lcInactive, lcArchived, deletedCount] = await Promise.all([
			prisma.user.count({ where }),
			prisma.user.count({ where: { deleted_at: null, ...activeCond } }),
			prisma.user.count({ where: { deleted_at: null, ...inactiveCond } }),
			prisma.user.count({ where: { deleted_at: null, ...archivedCond } }),
			prisma.user.count({ where: { deleted_at: { not: null } } }),
		])
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const page = Math.min(requestedPage, totalPages)

		const [users] = await Promise.all([
			prisma.user.findMany({
				where,
				orderBy: [{ created_at: direction }, { id: direction }],
				skip: (page - 1) * pageSize,
				take: pageSize,
				select: {
					id: true,
					name: true,
					username: true,
					email: true,
					status: true,
					last_active: true,
					created_at: true,
					avatar_base64: true,
					session_token: true,
					_count: {
						select: {
							scan: true,
							pantry_item: { where: { is_archived: false, deleted_at: null } },
						},
					},
				},
			}),
		])

		const rows = users.map((u) => {
			const lastActive = u.last_active ?? u.created_at
			const inactiveDays = daysBetween(lastActive, now)
			const status = deriveStatus(u.status, inactiveDays)
			const deletionDue = status === 'Archived' && inactiveDays >= DELETE_AFTER_DAYS

			const archivesInDays =
				status === 'Archived' ? null : Math.max(0, ARCHIVE_AFTER_DAYS - inactiveDays)

			const archivedOn =
				status === 'Archived'
					? new Date(lastActive.getTime() + ARCHIVE_AFTER_DAYS * MS_PER_DAY).toISOString()
					: null
			const deletesOn =
				status === 'Archived'
					? new Date(lastActive.getTime() + DELETE_AFTER_DAYS * MS_PER_DAY).toISOString()
					: null
			const deletesInDays =
				status === 'Archived' ? Math.max(0, DELETE_AFTER_DAYS - inactiveDays) : null

			return {
				id: u.id,
				name: u.name,
				username: u.username ?? null,
				email: u.email,
				email_masked: maskEmail(u.email),
				avatar_base64: u.avatar_base64 ?? null,
				created_at: u.created_at,
				last_active: lastActive,
				inactive_days: inactiveDays,
				inactive_for: formatInactiveFor(inactiveDays),
				status,
				is_online:
					!!u.session_token &&
					u.last_active != null &&
					u.last_active.getTime() >= now.getTime() - ONLINE_WINDOW_MS,
				deletion_due: deletionDue,
				scan_count: u._count.scan,
				pantry_item_count: u._count.pantry_item,
				archives_in_days: archivesInDays,
				archived_on: archivedOn,
				deletes_on: deletesOn,
				deletes_in_days: deletesInDays,
			}
		})

		const lifecycle = { active: lcActive, archived: lcArchived, deleted: deletedCount }
		const stats = {
			total: lcActive + lcInactive + lcArchived,
			active: lcActive,
			inactive: lcInactive,
			archived: lcArchived,
			deleted: deletedCount,
		}

		return {
			success: true,
			users: rows,
			pagination: { page, page_size: pageSize, total, total_pages: totalPages },
			lifecycle,
			stats,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch admin users:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch users.' })
	}
})
