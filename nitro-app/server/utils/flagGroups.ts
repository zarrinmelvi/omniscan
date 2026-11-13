import { prisma } from '../lib/prisma'

// Keyword sets mirror /api/admin/flagged-scans classification.
export const HALAL_KEYWORDS = ['halal', 'slaughter', 'certification', 'certif', 'stamp', 'logo', 'compliance']

export function isHalalReason(reason: string): boolean {
	const lower = reason.toLowerCase()
	return HALAL_KEYWORDS.some((k) => lower.includes(k))
}

// Group key rule: product name is the proxy for a distinct logo.
export function flagGroupKey(row: { id: number; scan?: { product?: { product_name?: string | null } | null } | null }): string {
	return row.scan?.product?.product_name || `flag-${row.id}`
}

// Groups rows by logo key, preserving first-seen order.
export function groupFlagsByLogo<T extends { id: number; scan?: { product?: { product_name?: string | null } | null } | null }>(
	rows: T[],
): Map<string, T[]> {
	const groups = new Map<string, T[]>()
	for (const row of rows) {
		const key = flagGroupKey(row)
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(row)
	}
	return groups
}

// Number of unresolved logo groups and the scans they cover (pending halal flags).
export async function getUnresolvedLogoSummary(
	db: typeof prisma = prisma,
): Promise<{ logoCount: number; scanCount: number }> {
	const pending = await db.flaggedScan.findMany({
		where: { status: 'pending' },
		orderBy: { created_at: 'desc' },
		select: {
			id: true,
			flag_reason: true,
			scan: { select: { product: { select: { product_name: true } } } },
		},
	})
	const rows = pending.filter((f) => isHalalReason(f.flag_reason))
	const groups = groupFlagsByLogo(rows)
	return { logoCount: groups.size, scanCount: rows.length }
}
