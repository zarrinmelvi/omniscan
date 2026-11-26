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

/**
 * Stem a normalised product name for singular/plural fuzzy matching.
 * Strips a trailing 's' or 'es' so "onions" and "onion" share the same stem.
 * Keeps the name intact when it is too short to safely strip (≤3 chars).
 */
function stem(name: string): string {
	if (name.length <= 3) return name
	if (name.endsWith('es')) return name.slice(0, -2)
	if (name.endsWith('s'))  return name.slice(0, -1)
	return name
}

/**
 * Fuzzy match for manually-uploaded products.
 *
 * Falls back to this when findCanonicalProduct finds no exact canonical_key
 * match. Loads all non-deleted products for the given brand and compares
 * stemmed product names. Returns the first (lowest id) canonical row whose
 * stem matches the incoming stem.
 *
 * This catches:
 *   "Red Onions"  vs "red onion"   (trailing s)
 *   "Soybeans"    vs "soybean"     (trailing s)
 *   "Tomatoes"    vs "tomato"      (trailing es)
 *   " red onion " vs "Red Onion"   (whitespace + case — handled by buildCanonicalKey norm)
 *
 * Returns null when no fuzzy match is found.
 */
export async function findFuzzyProduct(brand: string, productName: string) {
	const norm = (s: string) =>
		(s || '')
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()

	const incomingStem = stem(norm(productName))
	if (!incomingStem || incomingStem.length < 2) return null

	const candidates = await prisma.product.findMany({
		where: {
			brand_name: brand,
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

	for (const candidate of candidates) {
		if (stem(norm(candidate.product_name)) === incomingStem) {
			return candidate
		}
	}

	return null
}

export { }
