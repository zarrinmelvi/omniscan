import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

// Keyword sets that classify a flag_reason into a halal or allergen bucket.
const HALAL_KEYWORDS = ['halal', 'slaughter', 'certification', 'certif', 'stamp', 'logo', 'compliance']
const ALLERGEN_KEYWORDS = ['allergen', 'contains', 'may contain', 'ingredient', 'gluten', 'nut', 'dairy', 'egg', 'soy', 'wheat']

function classifyFlag(flag_reason: string): 'halal' | 'allergen' | 'other' {
	const lower = flag_reason.toLowerCase()
	if (HALAL_KEYWORDS.some((k) => lower.includes(k))) return 'halal'
	if (ALLERGEN_KEYWORDS.some((k) => lower.includes(k))) return 'allergen'
	return 'other'
}

/**
 * Strip the allergen fragment from a pipe-separated flag_reason so that
 * Halal-panel rows only show Halal-related copy.
 * e.g. "Red safety verdict: contains milk | Halal logo detected on packaging but not matched to a known certifier."
 *   → "Halal logo detected on packaging but not matched to a known certifier."
 */
function extractHalalReason(flag_reason: string): string {
	// Split on " | " and keep only the segments that are halal-related
	const parts = flag_reason.split(' | ')
	const halalParts = parts.filter((p) => {
		const lower = p.toLowerCase()
		return HALAL_KEYWORDS.some((k) => lower.includes(k))
	})
	// Fall back to the full string if no halal-specific segment found (shouldn't
	// happen since we only include halal-classified rows, but safe to guard)
	return halalParts.length > 0 ? halalParts.join(' | ') : flag_reason
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const statusFilter = typeof query.status === 'string' ? query.status : undefined
	// type=halal | allergen | other | all  (default: 'halal')
	const typeFilter = typeof query.type === 'string' ? query.type : 'halal'

	try {
		const flaggedScans = await prisma.flaggedScan.findMany({
			where: statusFilter ? { status: statusFilter } : undefined,
			orderBy: { created_at: 'desc' },
			select: {
				id: true,
				flag_reason: true,
				status: true,
				admin_correction: true,
				created_at: true,
				scan: {
					select: {
						id: true,
						safety_verdict: true,
						ai_confidence_score: true,
						// image_url is a relative filesystem path (uploads/<filename>) that
						// Nitro does not serve publicly.  We use the product's stored
						// image_base64 instead so the browser can display a data: URI.
						product: {
							select: {
								id: true,
								product_name: true,
								brand_name: true,
								image_base64: true,
								image_base64_back: true,
							},
						},
						user: { select: { id: true, name: true, email: true } },
					},
				},
			},
		})

		const mapped = flaggedScans.map((f) => ({
			id: f.id,
			flag_reason: f.flag_reason,
			// clean_flag_reason strips allergen fragments from mixed flags so
			// the Halal panel only shows Halal-related badge text
			clean_flag_reason: extractHalalReason(f.flag_reason),
			status: f.status,
			admin_correction: f.admin_correction,
			created_at: f.created_at,
			product_name: f.scan?.product?.product_name ?? 'Unknown product',
			brand_name: f.scan?.product?.brand_name ?? '',
			safety_verdict: f.scan?.safety_verdict ?? null,
			// Convert Prisma Decimal to a 0-100 integer percentage.
			// The DB stores values as 0.0–1.0 (e.g. 0.75 → 75%) or already as
			// whole numbers (e.g. 75); handle both cases.
			ai_confidence_score: f.scan?.ai_confidence_score != null
				? (() => {
					const raw = Number(f.scan!.ai_confidence_score)
					return Math.round(raw <= 1 ? raw * 100 : raw)
				})()
				: null,
			scanned_by: f.scan?.user?.name ?? f.scan?.user?.email ?? 'Unknown user',
			halal_flag_type: classifyFlag(f.flag_reason),
			// Base64 strings for the product thumbnail — null when not yet captured
			image_base64:      f.scan?.product?.image_base64      ?? null,
			image_base64_back: f.scan?.product?.image_base64_back ?? null,
		}))

		// Apply type filter after mapping (client can pass type=all to skip)
		const filtered = typeFilter === 'all'
			? mapped
			: mapped.filter((r) => r.halal_flag_type === typeFilter)

		return { success: true, flagged_scans: filtered }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch flagged scans:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch flagged scans.' })
	}
})
