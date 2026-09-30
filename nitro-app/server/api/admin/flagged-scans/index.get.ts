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

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const statusFilter = typeof query.status === 'string' ? query.status : undefined
	// type=halal | allergen | other | all  (default: 'halal')
	const typeFilter   = typeof query.type   === 'string' ? query.type   : 'halal'

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
						product: { select: { id: true, product_name: true, brand_name: true } },
						user: { select: { id: true, name: true, email: true } },
					},
				},
			},
		})

		const mapped = flaggedScans.map((f) => ({
			id: f.id,
			flag_reason: f.flag_reason,
			status: f.status,
			admin_correction: f.admin_correction,
			created_at: f.created_at,
			product_name: f.scan?.product?.product_name ?? 'Unknown product',
			brand_name:   f.scan?.product?.brand_name   ?? '',
			safety_verdict: f.scan?.safety_verdict ?? null,
			scanned_by: f.scan?.user?.name ?? f.scan?.user?.email ?? 'Unknown user',
			halal_flag_type: classifyFlag(f.flag_reason),
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
