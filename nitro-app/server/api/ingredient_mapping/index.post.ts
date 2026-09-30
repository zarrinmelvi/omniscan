import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { scientific_term?: string; simplified_term?: string; allergen_id?: number }
		| null

	if (!body?.scientific_term || typeof body.scientific_term !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'scientific_term is required.' })
	}
	if (!body?.allergen_id || Number.isNaN(Number(body.allergen_id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid allergen_id is required.' })
	}

	try {
		const mapping = await prisma.ingredientMapping.create({
			data: {
				scientific_term: body.scientific_term.trim(),
				simplified_term: (body.simplified_term ?? body.scientific_term).trim(),
				allergen_id: Number(body.allergen_id),
			},
		})
		return { success: true, ingredient_mapping: mapping }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'That scientific term is already mapped.' })
		}
		if (err?.code === 'P2003') {
			throw createError({ statusCode: 400, statusMessage: 'Referenced allergen does not exist.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to create ingredient mapping.' })
	}
})
