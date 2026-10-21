import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { fetchLogoAsBase64 } from '../../lib/logo-fetch'

/**
 * Feature C — Re-scrape a certifier's logo.
 *
 * Downloads the image from the direct link (or the stored source_url) and
 * parks it in `pending_logo_base64` WITHOUT overwriting the live logo. This
 * powers the admin compare dialog. The decision (keep / use_new) happens in
 * resolve-rescrape, which is also where last_checked_at is set.
 *
 * On a download failure we return 200 with { success:false, error } so the UI
 * can render its inline "Couldn't download" state instead of throwing.
 */
function toLogoSrc(logoBase64: string | null, imagePath: string | null): string | null {
	if (logoBase64) {
		return logoBase64.startsWith('data:') ? logoBase64 : `data:image/png;base64,${logoBase64}`
	}
	if (imagePath) {
		return '/' + imagePath.replace(/\.png$/i, '.svg')
	}
	return null
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { id?: number; direct_logo_url?: string }
		| null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid halal logo id is required.' })
	}

	const logo = await prisma.halalLogo.findUnique({ where: { id: Number(body.id) } })
	if (!logo) {
		throw createError({ statusCode: 404, statusMessage: 'Halal logo not found.' })
	}

	const url =
		body.direct_logo_url && body.direct_logo_url.trim()
			? body.direct_logo_url.trim()
			: logo.source_url?.trim()

	if (!url) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No logo URL to fetch. Add a direct image link via Edit.',
		})
	}

	const result = await fetchLogoAsBase64(url)
	if (!result.ok) {
		return { success: false as const, error: result.error }
	}

	await prisma.halalLogo.update({
		where: { id: logo.id },
		data: { pending_logo_base64: result.dataUri },
	})

	return {
		success: true as const,
		current: toLogoSrc(logo.logo_base64 ?? null, logo.image_path),
		pending: result.dataUri,
	}
})
