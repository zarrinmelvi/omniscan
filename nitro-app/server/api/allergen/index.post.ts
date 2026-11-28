import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

const ALLERGEN_NAME_RE = /^[A-Za-z\s\-]+$/

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { name?: string; scientific_name?: string; is_predefined?: boolean }
		| null

	if (!body?.name || typeof body.name !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Allergen name is required.' })
	}

	const name = body.name.trim()
	if (name.length > 50) {
		throw createError({ statusCode: 400, statusMessage: 'Allergen name must be 50 characters or fewer.' })
	}
	if (!ALLERGEN_NAME_RE.test(name)) {
		throw createError({ statusCode: 400, statusMessage: 'Allergen name may only contain letters, spaces, and hyphens.' })
	}

	try {
		const allergen = await prisma.allergen.create({
			data: {
				name,
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
