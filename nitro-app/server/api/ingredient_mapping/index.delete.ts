import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const id = Number(query.id)
	if (!id || Number.isNaN(id)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid ingredient mapping id is required.' })
	}

	try {
		await prisma.ingredientMapping.delete({ where: { id } })
		return { success: true, id }
	} catch (err: any) {
		if (err?.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Ingredient mapping not found.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to delete ingredient mapping.' })
	}
})
