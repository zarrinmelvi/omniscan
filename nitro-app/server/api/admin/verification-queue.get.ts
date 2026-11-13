import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { isHalalReason, groupFlagsByLogo } from '../../utils/flagGroups'

// A single card rendered in the Verification Panel queues. Every field is
// derived from real DB rows — no fabricated counts or AI-match guesses.
interface Card {
	id: number
	title: string
	scanCount: number
	productCount: number
	consumerCount: number
	examples: string[]
	thumb: string | null
	rawIds: number[]
}

interface ResolvedCard extends Card {
	outcome: 'approved' | 'dismissed'
	outcomeLabel: 'Added to certifier registry' | 'Not a Halal certifier'
	decidedAt: string
}

// Phrases that indicate the logo could not be matched to a known certifier.
const UNMATCHED_PHRASES = ['not matched', 'unverified', 'could not', 'unrecognized', 'unrecognised', 'no registry', 'not recognized', 'not recognised']

function toDataUri(base64: string | null | undefined): string | null {
	if (!base64) return null
	return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const parsedPage = parseInt(String(query.page ?? ''), 10)
	const parsedSize = parseInt(String(query.pageSize ?? ''), 10)
	const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1
	const pageSize = Number.isFinite(parsedSize) ? Math.min(50, Math.max(1, parsedSize)) : 10

	try {
		const now = new Date()
		const weekAgo = new Date(now)
		weekAgo.setDate(weekAgo.getDate() - 7)

		const [
			pendingFlagged,
			awaitingRescanCount,
			pendingAllTime,
			awaitingAllTime,
			resolvedAllTime,
			resolvedThisWeek,
			corrections,
			resolvedFlags,
		] = await Promise.all([
			// Pending flagged scans with scan → product → user, for the
			// unmatched-logo queue grouping.
			prisma.flaggedScan.findMany({
				where: { status: 'pending' },
				orderBy: { created_at: 'desc' },
				select: {
					id: true,
					flag_reason: true,
					logo_crop_base64: true,
					scan: {
						select: {
							user_id: true,
							product: {
								select: { id: true, product_name: true, image_base64: true },
							},
						},
					},
				},
			}),
			prisma.flaggedScan.count({ where: { status: 'awaiting_rescan' } }),
			prisma.flaggedScan.count({ where: { status: 'pending' } }),
			prisma.flaggedScan.count({ where: { status: 'awaiting_rescan' } }),
			prisma.flaggedScan.count({ where: { status: { in: ['approved', 'dismissed'] } } }),
			prisma.flaggedScan.count({
				where: { status: { in: ['approved', 'dismissed'] }, updated_at: { gte: weekAgo } },
			}),
			// Training corrections: flagged scans with a non-empty admin_correction.
			prisma.flaggedScan.findMany({
				where: { admin_correction: { not: null } },
				orderBy: { updated_at: 'desc' },
				take: 20,
				select: {
					id: true,
					admin_correction: true,
					scan: {
						select: {
							product: { select: { product_name: true, image_base64: true } },
						},
					},
				},
			}),
			// Resolved flags (light select, no base64) for the Resolved list and its counts.
			prisma.flaggedScan.findMany({
				where: { status: { in: ['approved', 'dismissed'] } },
				orderBy: { updated_at: 'desc' },
				select: {
					id: true,
					status: true,
					flag_reason: true,
					updated_at: true,
					scan: {
						select: {
							user_id: true,
							product: { select: { id: true, product_name: true } },
						},
					},
				},
			}),
		])

		// ── Resolved logo groups ──────────────────────────────────────────
		const resolvedRows = (resolvedFlags ?? []).filter((f) => isHalalReason(f.flag_reason))
		const resolvedGroups = [...groupFlagsByLogo(resolvedRows).values()].map((rows) => {
			const latest = rows.reduce((a, b) =>
				new Date(b.updated_at as any).getTime() > new Date(a.updated_at as any).getTime() ? b : a,
			)
			return { rows, latest }
		})
		// Newest decision first (stable for ties).
		resolvedGroups.sort(
			(a, b) => new Date(b.latest.updated_at as any).getTime() - new Date(a.latest.updated_at as any).getTime(),
		)
		const resolvedLogos = resolvedGroups.length
		const resolvedLogoScans = resolvedRows.length

		// ── Unmatched-logo queue ──────────────────────────────────────────
		// Treat all halal-type pending flags as the unmatched-logo queue (lenient,
		// per spec). If a flag reason additionally names an explicit "unmatched"
		// phrase it still qualifies — we don't require it. Group by product_name
		// as the proxy for a distinct logo.
		const unmatchedRows = pendingFlagged.filter((f) => isHalalReason(f.flag_reason))

		const groups = groupFlagsByLogo(unmatchedRows)

		const unmatched: Card[] = []
		let needsDecisionScans = 0
		let groupIndex = 0
		for (const [, rows] of groups) {
			groupIndex++
			const first = rows[0]
			const productIds = new Set(
				rows.map((r) => r.scan?.product?.id).filter((id): id is number => id != null),
			)
			const userIds = new Set(
				rows.map((r) => r.scan?.user_id).filter((id): id is number => id != null),
			)
			const exampleNames = [
				...new Set(
					rows
						.map((r) => r.scan?.product?.product_name)
						.filter((n): n is string => !!n),
				),
			].slice(0, 3)
			needsDecisionScans += rows.length
			unmatched.push({
				id: first.id,
				title: `Unrecognized Halal logo #${groupIndex}`,
				scanCount: rows.length,
				productCount: productIds.size > 0 ? productIds.size : 1,
				consumerCount: userIds.size,
				examples: exampleNames,
				// Prefer the cropped logo; older flags have none, so fall back to the product photo.
				thumb: toDataUri(rows.find((r) => r.logo_crop_base64)?.logo_crop_base64) ?? toDataUri(first.scan?.product?.image_base64),
				rawIds: rows.map((r) => r.id),
			})
		}

		const resolvedMode = String(query.status ?? '') === 'resolved'
		const totalGroups = resolvedMode ? resolvedLogos : unmatched.length
		const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize))
		const pagedUnmatched = resolvedMode ? [] : unmatched.slice((page - 1) * pageSize, page * pageSize)

		// ── Resolved cards (current page only; thumbnails fetched for that page) ──
		const resolved: ResolvedCard[] = []
		if (resolvedMode) {
			const pageGroups = resolvedGroups.slice((page - 1) * pageSize, page * pageSize)
			const pageIds = pageGroups.flatMap((g) => g.rows.map((r) => r.id))
			let thumbRows: any[] = []
			if (pageIds.length > 0) {
				try {
					thumbRows = (await prisma.flaggedScan.findMany({
						where: { id: { in: pageIds } },
						select: {
							id: true,
							logo_crop_base64: true,
							scan: { select: { product: { select: { image_base64: true } } } },
						},
					})) ?? []
				} catch {
					thumbRows = []
				}
			}
			const thumbById = new Map<number, any>(thumbRows.map((t) => [t.id, t]))
			pageGroups.forEach(({ rows, latest }, i) => {
				const first = rows[0]
				const productIds = new Set(
					rows.map((r) => r.scan?.product?.id).filter((id): id is number => id != null),
				)
				const userIds = new Set(
					rows.map((r) => r.scan?.user_id).filter((id): id is number => id != null),
				)
				const exampleNames = [
					...new Set(
						rows.map((r) => r.scan?.product?.product_name).filter((n): n is string => !!n),
					),
				].slice(0, 3)
				const thumbs = rows.map((r) => thumbById.get(r.id)).filter(Boolean)
				const approved = latest.status === 'approved'
				resolved.push({
					id: first.id,
					title: `Unrecognized Halal logo #${(page - 1) * pageSize + i + 1}`,
					scanCount: rows.length,
					productCount: productIds.size > 0 ? productIds.size : 1,
					consumerCount: userIds.size,
					examples: exampleNames,
					thumb:
						toDataUri(thumbs.find((t) => t.logo_crop_base64)?.logo_crop_base64) ??
						toDataUri(thumbs[0]?.scan?.product?.image_base64),
					rawIds: rows.map((r) => r.id),
					outcome: approved ? 'approved' : 'dismissed',
					outcomeLabel: approved ? 'Added to certifier registry' : 'Not a Halal certifier',
					decidedAt: new Date(latest.updated_at as any).toISOString(),
				})
			})
		}

		// ── auto_resolved_pct: real ratio of settled flags ────────────────
		const denom = resolvedAllTime + pendingAllTime + awaitingAllTime
		const autoResolvedPct = denom === 0 ? 100 : Math.round((resolvedAllTime / denom) * 100)

		// Duplicates tab was removed from the UI; keep the response shape stable.
		const duplicates: Card[] = []

		// ── Training corrections ──────────────────────────────────────────
		const training: Card[] = corrections
			.filter((c) => (c.admin_correction ?? '').trim() !== '')
			.slice(0, 6)
			.map((c) => {
				const name = c.scan?.product?.product_name || `Correction #${c.id}`
				return {
					id: c.id,
					title: name,
					scanCount: 1,
					productCount: 1,
					consumerCount: 1,
					examples: [name],
					thumb: toDataUri(c.scan?.product?.image_base64),
					rawIds: [c.id],
				}
			})

		return {
			success: true,
			metrics: {
				auto_resolved_pct: autoResolvedPct,
				needs_decision: unmatched.length,
				needs_decision_scans: needsDecisionScans,
				awaiting_rescan: awaitingRescanCount,
				resolved_this_week: resolvedThisWeek,
				resolved_logos: resolvedLogos,
				resolved_logo_scans: resolvedLogoScans,
			},
			unmatched: pagedUnmatched,
			resolved,
			pagination: { page, page_size: pageSize, total: totalGroups, total_pages: totalPages },
			duplicates,
			training,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch verification queue:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch verification queue.' })
	}
})
