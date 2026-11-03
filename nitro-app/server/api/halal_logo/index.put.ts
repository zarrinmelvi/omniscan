import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { fetchLogoAsBase64 } from '../../lib/logo-fetch'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| {
				id?: number
				certifier?: string
				full_name?: string
				image_path?: string
				source_url?: string
				direct_logo_url?: string
				is_accredited?: boolean
				is_active?: boolean
				country?: string
		  }
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
				...(body.direct_logo_url && body.direct_logo_url.trim() ? { source_url: body.direct_logo_url.trim() } : {}),
				...(body.is_accredited !== undefined ? { is_accredited: body.is_accredited } : {}),
				...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
				...(body.country !== undefined ? { country: body.country.trim() || null } : {}),
			},
		})

		// If a direct logo URL was provided, attempt to scrape the logo immediately
		// so the admin can compare logos right after saving.
		if (body.direct_logo_url && typeof body.direct_logo_url === 'string' && body.direct_logo_url.trim()) {
			const scrapeResult = await fetchLogoAsBase64(body.direct_logo_url.trim())
			if (scrapeResult.ok) {
				await prisma.halalLogo.update({
					where: { id: Number(body.id) },
					data: { pending_logo_base64: scrapeResult.dataUri },
				})
			}
		}

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
