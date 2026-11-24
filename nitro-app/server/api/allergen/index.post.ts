import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { name?: string; scientific_name?: string; is_predefined?: boolean }
		| null

	if (!body?.name || typeof body.name !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Allergen name is required.' })
	}

	try {
		const allergen = await prisma.allergen.create({
			data: {
				name: body.name.trim(),
				scientific_name: (body.scientific_name ?? '').trim(),
				is_predefined: body.is_predefined ?? false,
			},
		})
		return { success: true, allergen }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'An allergen with that name already exists.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to create allergen.' })
	}
})
