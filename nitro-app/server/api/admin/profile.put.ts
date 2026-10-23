import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { logAuditEvent } from '../../lib/audit-logger'

/**
 * PUT /api/admin/profile
 * Lets the signed-in admin update their own display name and/or email. Only
 * the fields actually present in the body are written; everything else is
 * left untouched. Guarded by requireAdminAuth so a consumer token can never
 * reach this endpoint.
 */
export default defineEventHandler(async (event) => {
	const admin = requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { full_name?: unknown; email?: unknown }
		| null

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'A request body is required.' })
	}

	// Build the update payload from provided fields only — skip anything that
	// is not supplied so we never clobber an existing value with undefined.
	const data: { full_name?: string; email?: string } = {}

	if (body.full_name !== undefined) {
		if (typeof body.full_name !== 'string' || body.full_name.trim() === '') {
			throw createError({ statusCode: 400, statusMessage: 'Display name must be a non-empty string.' })
		}
		data.full_name = body.full_name.trim()
	}

	if (body.email !== undefined) {
		if (typeof body.email !== 'string' || !body.email.includes('@')) {
			throw createError({ statusCode: 400, statusMessage: 'A valid email is required.' })
		}
		data.email = body.email.trim()
	}

	if (Object.keys(data).length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'No updatable fields were provided.' })
	}

	try {
		const updated = await prisma.admin.update({
			where: { id: admin.id },
			data,
			select: { id: true, full_name: true, email: true },
		})

		await logAuditEvent({
			event_type: 'UPDATE',
			entity: 'Admin',
			entity_id: admin.id,
			triggered_by_admin_id: admin.id,
			summary: `Admin ${admin.username} updated their profile`,
		})

		return { success: true, admin: { id: updated.id, full_name: updated.full_name, email: updated.email } }
	} catch (err: any) {
		// P2002 = unique-constraint violation (email already taken).
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'That email is already in use.' })
		}
		if (err?.statusCode) throw err
		console.error('Failed to update admin profile:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to update profile.' })
	}
})
