import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { certifier?: string; full_name?: string; image_path?: string; source_url?: string; is_accredited?: boolean }
		| null

	if (!body?.certifier || typeof body.certifier !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'certifier is required.' })
	}

	try {
		const halalLogo = await prisma.halalLogo.create({
			data: {
				certifier: body.certifier.trim(),
				full_name: (body.full_name ?? '').trim(),
				image_path: (body.image_path ?? '').trim(),
				source_url: (body.source_url ?? '').trim(),
				scraped_date: new Date(),
				is_accredited: body.is_accredited ?? false,
			},
		})
		return { success: true, halalLogo }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'A certifier with that name already exists.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to create halal logo.' })
	}
})
