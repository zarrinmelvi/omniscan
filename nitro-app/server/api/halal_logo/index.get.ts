import { eventHandler, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'

const DAY_MS = 86_400_000

/**
 * Turn a stored logo value into something an <img :src> can use.
 * - base64 column → data URI (add prefix only if not already a data: URI)
 * - else bundled-SVG path (legacy .png normalised to .svg, served from the
 *   frontend /public folder at '/' + image_path)
 * - else null
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

export default eventHandler(async function (event) {
	const query = getQuery(event)

	const take = Number(query?.take) ?? 2
	const skip = Number(query?.skip) ?? 0

	const halalLogo = await prisma.halalLogo.findMany({ take, skip })
	const halalLogoCount = await prisma.halalLogo.count()

	const now = Date.now()
	const since = new Date(now - 30 * DAY_MS)

	// Per-logo scan count in the last 30 days. Count scans whose product is
	// linked to this certifier either via the legacy scalar FK or the join
	// table. The certifier list is small, so a per-logo count under Promise.all
	// is perfectly fine.
	const mapped = await Promise.all(
		halalLogo.map(async (logo) => {
			const matched_scans_30d = await prisma.scan.count({
				where: {
					scan_time: { gte: since },
					product: {
						OR: [
							{ halal_logo_id: logo.id },
							{ halal_logos: { some: { halal_logo_id: logo.id, deleted_at: null } } },
						],
					},
				},
			})

			const lastChecked = logo.last_checked_at ? new Date(logo.last_checked_at) : null
			const days_since_checked = lastChecked
				? Math.floor((now - lastChecked.getTime()) / DAY_MS)
				: null
			const overdue = days_since_checked === null || days_since_checked > 30

			const logo_src = toLogoSrc(logo.logo_base64 ?? null, logo.image_path)
			const has_pending = logo.pending_logo_base64 != null
			const pending_logo_src = has_pending
				? toLogoSrc(logo.pending_logo_base64 ?? null, null)
				: null

			return {
				id: logo.id,
				certifier: logo.certifier,
				full_name: logo.full_name,
				image_path: logo.image_path,
				source_url: logo.source_url,
				scraped_date: logo.scraped_date,
				is_accredited: logo.is_accredited,
				country: logo.country ?? null,
				is_active: logo.is_active ?? true,
				last_checked_at: logo.last_checked_at ?? null,
				days_since_checked,
				overdue,
				matched_scans_30d,
				logo_src,
				has_pending,
				pending_logo_src,
			}
		})
	)

	return { halalLogo: mapped, halalLogoCount }
})
