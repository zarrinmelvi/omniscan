import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

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

// Keyword sets mirror /api/admin/flagged-scans classification.
const HALAL_KEYWORDS = ['halal', 'slaughter', 'certification', 'certif', 'stamp', 'logo', 'compliance']
// Phrases that indicate the logo could not be matched to a known certifier.
const UNMATCHED_PHRASES = ['not matched', 'unverified', 'could not', 'unrecognized', 'unrecognised', 'no registry', 'not recognized', 'not recognised']

function isHalalReason(reason: string): boolean {
	const lower = reason.toLowerCase()
	return HALAL_KEYWORDS.some((k) => lower.includes(k))
}

function toDataUri(base64: string | null | undefined): string | null {
	if (!base64) return null
	return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

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
		] = await Promise.all([
			// Pending flagged scans with scan → product → user, for the
			// unmatched-logo queue grouping.
			prisma.flaggedScan.findMany({
				where: { status: 'pending' },
				orderBy: { created_at: 'desc' },
				select: {
					id: true,
					flag_reason: true,
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
		])

		// ── Unmatched-logo queue ──────────────────────────────────────────
		// Treat all halal-type pending flags as the unmatched-logo queue (lenient,
		// per spec). If a flag reason additionally names an explicit "unmatched"
		// phrase it still qualifies — we don't require it. Group by product_name
		// as the proxy for a distinct logo.
		const unmatchedRows = pendingFlagged.filter((f) => isHalalReason(f.flag_reason))

		const groups = new Map<string, typeof unmatchedRows>()
		for (const row of unmatchedRows) {
			const key = row.scan?.product?.product_name || `flag-${row.id}`
			if (!groups.has(key)) groups.set(key, [])
			groups.get(key)!.push(row)
		}

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
				thumb: toDataUri(first.scan?.product?.image_base64),
				rawIds: rows.map((r) => r.id),
			})
		}

		// ── auto_resolved_pct: real ratio of settled flags ────────────────
		const denom = resolvedAllTime + pendingAllTime + awaitingAllTime
		const autoResolvedPct = denom === 0 ? 100 : Math.round((resolvedAllTime / denom) * 100)

		// ── Possible duplicates: products sharing a canonical_key ─────────
		const dupGroups = await prisma.product.groupBy({
			by: ['canonical_key'],
			where: { canonical_key: { not: null }, deleted_at: null },
			_count: { _all: true },
			having: { canonical_key: { _count: { gte: 2 } } },
			take: 6,
		})

		const duplicates: Card[] = []
		for (let i = 0; i < dupGroups.length; i++) {
			const key = dupGroups[i].canonical_key
			if (!key) continue
			const products = await prisma.product.findMany({
				where: { canonical_key: key, deleted_at: null },
				select: {
					id: true,
					product_name: true,
					image_base64: true,
					_count: { select: { scan: true } },
					scan: { select: { user_id: true } },
				},
			})
			if (products.length === 0) continue
			const rep = products[0]
			const scanCount = products.reduce((sum, p) => sum + p._count.scan, 0)
			const userIds = new Set<number>()
			for (const p of products) for (const s of p.scan) userIds.add(s.user_id)
			duplicates.push({
				id: rep.id,
				title: rep.product_name || `Possible duplicate #${i + 1}`,
				scanCount,
				productCount: products.length,
				consumerCount: userIds.size,
				examples: [...new Set(products.map((p) => p.product_name).filter(Boolean))].slice(0, 3),
				thumb: toDataUri(rep.image_base64),
				rawIds: [],
			})
		}

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
			},
			unmatched,
			duplicates,
			training,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch verification queue:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch verification queue.' })
	}
})
