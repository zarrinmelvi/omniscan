import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

const ALLERGEN_NAME_RE = /^[A-Za-z\s\-]+$/

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { id?: number; name?: string; scientific_name?: string; is_predefined?: boolean }
		| null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid allergen id is required.' })
	}

	// Validate name only when it is being updated.
	if (body.name !== undefined) {
		const name = body.name.trim()
		if (!name) {
			throw createError({ statusCode: 400, statusMessage: 'Allergen name is required.' })
		}
		if (name.length > 50) {
			throw createError({ statusCode: 400, statusMessage: 'Allergen name must be 50 characters or fewer.' })
		}
		if (!ALLERGEN_NAME_RE.test(name)) {
			throw createError({ statusCode: 400, statusMessage: 'Allergen name may only contain letters, spaces, and hyphens.' })
		}
	}

	try {
		const allergen = await prisma.allergen.update({
			where: { id: Number(body.id) },
			data: {
				...(body.name !== undefined ? { name: body.name.trim() } : {}),
				...(body.scientific_name !== undefined ? { scientific_name: body.scientific_name.trim() } : {}),
				...(body.is_predefined !== undefined ? { is_predefined: body.is_predefined } : {}),
			},
		})
		return { success: true, allergen }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'An allergen with that name already exists.' })
		}
		if (err?.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Allergen not found.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to update allergen.' })
	}
})
