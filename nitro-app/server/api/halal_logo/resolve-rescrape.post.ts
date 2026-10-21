import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { logAuditEvent } from '../../lib/audit-logger'

/**
 * Feature C — Resolve a pending re-scrape.
 *
 * decision 'use_new' promotes pending_logo_base64 to the live logo_base64.
 * decision 'keep' discards the pending image. Either way the pending slot is
 * cleared and last_checked_at is stamped to now — a re-scrape always ends with
 * the certifier marked as checked.
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { id?: number; decision?: 'keep' | 'use_new' }
		| null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid halal logo id is required.' })
	}
	if (body.decision !== 'keep' && body.decision !== 'use_new') {
		throw createError({ statusCode: 400, statusMessage: 'decision must be "keep" or "use_new".' })
	}

	const logo = await prisma.halalLogo.findUnique({ where: { id: Number(body.id) } })
	if (!logo) {
		throw createError({ statusCode: 404, statusMessage: 'Halal logo not found.' })
	}

	const last_checked_at = new Date()
	const useNew = body.decision === 'use_new' && logo.pending_logo_base64 != null

	const updated = await prisma.halalLogo.update({
		where: { id: logo.id },
		data: {
			...(useNew ? { logo_base64: logo.pending_logo_base64 } : {}),
			pending_logo_base64: null,
			last_checked_at,
		},
	})

	await logAuditEvent({
		event_type: 'UPDATE',
		entity: 'HalalLogo',
		entity_id: logo.id,
		triggered_by_admin_id: admin.id,
		summary: `Admin ${admin.username} ${
			body.decision === 'use_new' ? 'updated' : 'kept'
		} logo for certifier #${logo.id}`,
	})

	return { success: true, last_checked_at: updated.last_checked_at }
})
