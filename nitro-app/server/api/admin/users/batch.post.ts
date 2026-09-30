import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

type BatchAction = 'archive' | 'delete' | 'notify'

interface BatchBody {
	ids?: number[]
	action?: BatchAction
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as BatchBody | null

	const rawIds = Array.isArray(body?.ids) ? body!.ids : []
	const ids = Array.from(
		new Set(rawIds.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)),
	)
	const action = body?.action

	if (ids.length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'At least one valid user id is required.' })
	}
	if (action !== 'archive' && action !== 'delete' && action !== 'notify') {
		throw createError({ statusCode: 400, statusMessage: 'action must be one of: archive, delete, notify.' })
	}

	try {
		if (action === 'archive') {
			const res = await prisma.user.updateMany({
				where: { id: { in: ids }, deleted_at: null },
				data: { status: 'archived' },
			})
			return { success: true, action, affected: res.count }
		}

		if (action === 'delete') {
			// Soft delete: set deleted_at so the admin users list (which filters
			// deleted_at: null) hides them, without breaking FK-referenced history.
			const res = await prisma.user.updateMany({
				where: { id: { in: ids }, deleted_at: null },
				data: { deleted_at: new Date() },
			})
			return { success: true, action, affected: res.count }
		}

		// action === 'notify' — create an inactivity-reminder notification per user.
		const targets = await prisma.user.findMany({
			where: { id: { in: ids }, deleted_at: null },
			select: { id: true },
		})
		if (targets.length === 0) {
			return { success: true, action, affected: 0 }
		}
		const message =
			'Your OmniScan account has been inactive. Please log in soon to keep your account active and avoid archival.'
		const created = await prisma.notification.createMany({
			data: targets.map((u) => ({
				user_id: u.id,
				type: 'inactivity_reminder',
				message,
				is_read: false,
			})),
		})
		return { success: true, action, affected: created.count }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Batch user action failed:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to apply batch action.' })
	}
})
