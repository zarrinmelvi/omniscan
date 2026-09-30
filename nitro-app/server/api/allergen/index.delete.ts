import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const id = Number(query.id)
	if (!id || Number.isNaN(id)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid allergen id is required.' })
	}

	try {
		// Remove dependent ingredient mappings first to satisfy the FK constraint.
		await prisma.ingredientMapping.deleteMany({ where: { allergen_id: id } })
		await prisma.allergen.delete({ where: { id } })
		return { success: true, id }
	} catch (err: any) {
		if (err?.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Allergen not found.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to delete allergen.' })
	}
})
