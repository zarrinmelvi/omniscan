import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../../../lib/prisma'
import { requireAdminAuth } from '../../../../utils/requireAdminAuth'

const HALAL_KEYWORDS = ['halal', 'slaughter', 'certification', 'certif', 'stamp', 'logo', 'compliance']

function extractHalalReason(flag_reason: string): string {
	const parts = flag_reason.split(' | ')
	const halalParts = parts.filter((p) => {
		const lower = p.toLowerCase()
		return HALAL_KEYWORDS.some((k) => lower.includes(k))
	})
	return halalParts.length > 0 ? halalParts.join(' | ') : flag_reason
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const idParam = getRouterParam(event, 'id')
	const flaggedScanId = idParam ? Number(idParam) : NaN

	if (!idParam || Number.isNaN(flaggedScanId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid flagged scan id is required.' })
	}

	try {
		const f = await prisma.flaggedScan.findUnique({
			where: { id: flaggedScanId },
			select: {
				id: true,
				flag_reason: true,
				status: true,
				admin_correction: true,
				created_at: true,
				scan: {
					select: {
						id: true,
						// image_url is a server-side filesystem path that is not publicly
						// served by Nitro on Vercel.  Prefer product.image_base64 for display.
						image_url: true,
						image_url_back: true,
						scan_time: true,
						ai_confidence_score: true,
						safety_verdict: true,
						flag_reason: true,
						product: {
							select: {
								id: true,
								product_name: true,
								brand_name: true,
								ingredient_text: true,
								image_base64: true,
								image_base64_back: true,
							},
						},
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
			},
		})

		if (!f) {
			throw createError({ statusCode: 404, statusMessage: 'Flagged scan not found.' })
		}

		return {
			success: true,
			detail: {
				id: f.id,
				flag_reason: f.flag_reason,
				clean_flag_reason: extractHalalReason(f.flag_reason),
				status: f.status,
				admin_correction: f.admin_correction,
				created_at: f.created_at,
				scan_id: f.scan?.id ?? null,
				// Use product image_base64 as the primary display image source.
				// image_url / image_url_back are kept for reference (server-side paths)
				// but are not displayable directly in the browser from Vercel.
				image_base64:      f.scan?.product?.image_base64      ?? null,
				image_base64_back: f.scan?.product?.image_base64_back ?? null,
				image_url: f.scan?.image_url ?? null,
				image_url_back: f.scan?.image_url_back ?? null,
				scan_time: f.scan?.scan_time ?? null,
				ai_confidence_score: f.scan?.ai_confidence_score ?? null,
				safety_verdict: f.scan?.safety_verdict ?? null,
				ocr_flag_reason: f.scan?.flag_reason ?? null,
				product_name: f.scan?.product?.product_name ?? 'Unknown product',
				brand_name: f.scan?.product?.brand_name ?? '',
				ingredient_text: f.scan?.product?.ingredient_text ?? null,
				scanned_by_name: f.scan?.user?.name ?? null,
				scanned_by_email: f.scan?.user?.email ?? null,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch flagged scan detail:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch flagged scan detail.' })
	}
})
