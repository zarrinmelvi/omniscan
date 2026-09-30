import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { id?: number; name?: string; scientific_name?: string; is_predefined?: boolean }
		| null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid allergen id is required.' })
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
