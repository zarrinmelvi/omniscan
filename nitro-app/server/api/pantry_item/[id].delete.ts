// server/api/pantry/[id].delete.ts
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const idParam = getRouterParam(event, 'id')
	const itemId = Number(idParam)

	if (!idParam || isNaN(itemId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid pantry item id is required.' })
	}

	try {
		const existingItem = await prisma.pantryItem.findUnique({ where: { id: itemId } })

		if (!existingItem || existingItem.deleted_at) {
			throw createError({ statusCode: 404, statusMessage: 'Pantry item not found.' })
		}

		if (existingItem.user_id !== authUser.id) {
			throw createError({ statusCode: 403, statusMessage: 'You do not have access to this pantry item.' })
		}

		await prisma.pantryItem.update({
			where: { id: itemId },
			data: { is_archived: true, deleted_at: new Date() },
		})

		return { success: true }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to delete pantry item:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to delete pantry item.' })
	}
})
