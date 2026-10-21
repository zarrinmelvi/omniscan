import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { logAuditEvent } from '../../lib/audit-logger'

/**
 * Feature C — Mark a certifier as checked without re-scraping.
 *
 * Stamps last_checked_at to now and clears any parked pending logo. Resets the
 * monthly-check reminder for this certifier.
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as { id?: number } | null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid halal logo id is required.' })
	}

	const logo = await prisma.halalLogo.findUnique({ where: { id: Number(body.id) } })
	if (!logo) {
		throw createError({ statusCode: 404, statusMessage: 'Halal logo not found.' })
	}

	const last_checked_at = new Date()
	const updated = await prisma.halalLogo.update({
		where: { id: logo.id },
		data: { last_checked_at, pending_logo_base64: null },
	})

	await logAuditEvent({
		event_type: 'UPDATE',
		entity: 'HalalLogo',
		entity_id: logo.id,
		triggered_by_admin_id: admin.id,
		summary: `Admin ${admin.username} marked certifier #${logo.id} as checked`,
	})

	return { success: true, last_checked_at: updated.last_checked_at }
})
