import { prisma } from './prisma'

/**
 * Normalize brand + product name into a stable dedup key.
 * Lowercase, strip non-alphanumerics to single spaces, collapse whitespace.
 * e.g. ("Nestlé", "MILO 3-in-1!!") -> "nestle|milo 3 in 1"
 */
export function buildCanonicalKey(brand: string, productName: string): string {
	const norm = (s: string) =>
		(s || '')
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '') // strip diacritics
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	const b = norm(brand)
	const p = norm(productName)
	return `${b}|${p}`
}

/**
 * Find the canonical Product for a given brand/name, if one already exists.
 * Returns the earliest non-deleted row whose canonical_key matches AND which is
 * itself canonical (canonical_product_id is null). Returns null if none.
 *
 * Skips placeholder brands that should never dedupe ("Unknown", "Manually Added"
 * with empty names) — but a real manual name still dedupes against prior scans.
 */
export async function findCanonicalProduct(brand: string, productName: string) {
	const key = buildCanonicalKey(brand, productName)
	// A key of just "|" or "<brand>|" with empty product name is too weak to dedupe.
	const [, p] = key.split('|')
	if (!p || p.length < 2) return null

	return prisma.product.findFirst({
		where: {
			canonical_key: key,
			canonical_product_id: null,
			deleted_at: null,
		},
		orderBy: { id: 'asc' },
		select: {
			id: true,
			brand_name: true,
			product_name: true,
			ingredient_text: true,
			simplified_ingredients: true,
			halal_logo_id: true,
			halal_unverified: true,
			confirmed_not_halal: true,
		},
	})
}

export { }
