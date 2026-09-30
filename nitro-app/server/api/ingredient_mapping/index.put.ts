import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { id?: number; scientific_term?: string; simplified_term?: string; allergen_id?: number }
		| null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid ingredient mapping id is required.' })
	}

	try {
		const mapping = await prisma.ingredientMapping.update({
			where: { id: Number(body.id) },
			data: {
				...(body.scientific_term !== undefined ? { scientific_term: body.scientific_term.trim() } : {}),
				...(body.simplified_term !== undefined ? { simplified_term: body.simplified_term.trim() } : {}),
				...(body.allergen_id !== undefined ? { allergen_id: Number(body.allergen_id) } : {}),
			},
		})
		return { success: true, ingredient_mapping: mapping }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'That scientific term is already mapped.' })
		}
		if (err?.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Ingredient mapping not found.' })
		}
		if (err?.code === 'P2003') {
			throw createError({ statusCode: 400, statusMessage: 'Referenced allergen does not exist.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to update ingredient mapping.' })
	}
})
