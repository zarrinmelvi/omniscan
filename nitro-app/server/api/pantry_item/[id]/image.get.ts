import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAuth } from '../../../utils/requireAuth'
import { makeThumbDataUri } from '../../../lib/image-thumb'

// Fallback for legacy products that have a full image but no thumbnail yet:
// builds the thumbnail on demand, persists it, and returns only the thumbnail.
export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const idParam = getRouterParam(event, 'id')
	const itemId = Number(idParam)

	if (!idParam || isNaN(itemId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid pantry item id is required.' })
	}

	try {
		const item = await prisma.pantryItem.findUnique({
			where: { id: itemId },
			select: {
				user_id: true,
				deleted_at: true,
				product: { select: { id: true, image_base64: true, image_thumb_base64: true } },
			},
		})

		if (!item || item.deleted_at) {
			throw createError({ statusCode: 404, statusMessage: 'Pantry item not found.' })
		}

		if (item.user_id !== authUser.id) {
			throw createError({ statusCode: 403, statusMessage: 'You do not have access to this pantry item.' })
		}

		let thumb = item.product.image_thumb_base64 ?? null

		if (!thumb && item.product.image_base64) {
			thumb = await makeThumbDataUri(item.product.image_base64)
			if (thumb) {
				await prisma.product.update({
					where: { id: item.product.id },
					data: { image_thumb_base64: thumb },
				})
			}
		}

		return { success: true, image_base64: thumb }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to load pantry item image:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to load pantry item image.' })
	}
})
