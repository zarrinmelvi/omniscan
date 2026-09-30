import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { id?: number; certifier?: string; full_name?: string; image_path?: string; source_url?: string; is_accredited?: boolean }
		| null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid halal logo id is required.' })
	}

	try {
		const halalLogo = await prisma.halalLogo.update({
			where: { id: Number(body.id) },
			data: {
				...(body.certifier !== undefined ? { certifier: body.certifier.trim() } : {}),
				...(body.full_name !== undefined ? { full_name: body.full_name.trim() } : {}),
				...(body.image_path !== undefined ? { image_path: body.image_path.trim() } : {}),
				...(body.source_url !== undefined ? { source_url: body.source_url.trim() } : {}),
				...(body.is_accredited !== undefined ? { is_accredited: body.is_accredited } : {}),
			},
		})
		return { success: true, halalLogo }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'A certifier with that name already exists.' })
		}
		if (err?.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Halal logo not found.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to update halal logo.' })
	}
})
