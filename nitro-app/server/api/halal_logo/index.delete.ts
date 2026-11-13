import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const id = Number(query.id)
	if (!id || Number.isNaN(id)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid halal logo id is required.' })
	}

	const existing = await prisma.halalLogo.findUnique({ where: { id }, select: { id: true, is_active: true } })
	if (!existing) {
		throw createError({ statusCode: 404, statusMessage: 'Halal logo not found.' })
	}
	if (existing.is_active) {
		throw createError({ statusCode: 409, statusMessage: 'Only inactive logos can be deleted. Deactivate it first.' })
	}

	try {
		// Join rows cascade; the single-FK columns are nullable, so detach them explicitly.
		await prisma.$transaction([
			prisma.product.updateMany({ where: { halal_logo_id: id }, data: { halal_logo_id: null } }),
			prisma.catalogProduct.updateMany({ where: { halal_logo_id: id }, data: { halal_logo_id: null } }),
			prisma.halalLogo.delete({ where: { id } }),
		])
		return { success: true, id }
	} catch (err: any) {
		if (err?.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Halal logo not found.' })
		}
		if (err?.code === 'P2003') {
			throw createError({ statusCode: 409, statusMessage: 'Cannot delete: this certifier is still linked to products.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to delete halal logo.' })
	}
})
