import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { fetchLogoAsBase64 } from '../../lib/logo-fetch'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| {
				certifier?: string
				full_name?: string
				image_path?: string
				source_url?: string
				is_accredited?: boolean
				country?: string
				direct_logo_url?: string
		  }
		| null

	if (!body?.certifier || typeof body.certifier !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'certifier is required.' })
	}

	// If a direct https image link was supplied, try to fetch + store it now so
	// the certifier is created with a live logo. A failed download must NOT block
	// record creation — we just log and create without the image.
	let logo_base64: string | null = null
	let last_checked_at: Date | null = null
	if (body.direct_logo_url && typeof body.direct_logo_url === 'string') {
		const result = await fetchLogoAsBase64(body.direct_logo_url)
		if (result.ok) {
			logo_base64 = result.dataUri
			last_checked_at = new Date()
		} else {
			console.error('[halal_logo.post] logo fetch failed:', result.error)
		}
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
				country: body.country?.trim() || null,
				logo_base64,
				last_checked_at,
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
