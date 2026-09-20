export interface CatalogProductRecord {
	id: number
	brand_name: string
	product_name: string
	ingredient_text: string
	simplified_ingredients: string
	halal_logo_id: number | null
	variant_group: string | null
	halal_logos: { halal_logo: { id: number; certifier: string; is_accredited: boolean } }[]
}

const CATALOG_MATCH_OVERLAP_THRESHOLD = 0.5

function normalizeForCatalogMatch(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function tokenize(text: string): Set<string> {
	return new Set(
		normalizeForCatalogMatch(text)
			.split(' ')
			.filter((w) => w.length > 1),
	)
}

// Generalized from a ScanAiExtraction-shaped input to just {brand, product_name}
// so callers with a real, already-stored Product row (not a fresh AI
// extraction) can use the exact same matching logic.
export function matchCatalogProduct(identity: { brand: string; product_name: string }, catalog: CatalogProductRecord[]): CatalogProductRecord | null {
	const extractedBrand = normalizeForCatalogMatch(identity.brand)
	const extractedTokens = tokenize(`${identity.brand} ${identity.product_name}`)
	if (!extractedBrand || extractedTokens.size === 0) return null

	let best: { record: CatalogProductRecord; score: number } | null = null

	for (const cp of catalog) {
		const knownBrand = normalizeForCatalogMatch(cp.brand_name)
		if (!knownBrand) continue
		if (!(knownBrand.includes(extractedBrand) || extractedBrand.includes(knownBrand))) continue

		const knownTokens = tokenize(`${cp.brand_name} ${cp.product_name}`)
		const overlapCount = [...extractedTokens].filter((t) => knownTokens.has(t)).length
		const score = overlapCount / Math.max(extractedTokens.size, knownTokens.size)

		if (score > (best?.score ?? 0)) {
			best = { record: cp, score }
		}
	}

	return best && best.score >= CATALOG_MATCH_OVERLAP_THRESHOLD ? best.record : null
}

// Shared select shape for prisma.catalogProduct.findMany(), so every caller
// fetches consistent fields.
export const CATALOG_PRODUCT_SELECT = {
	id: true,
	brand_name: true,
	product_name: true,
	ingredient_text: true,
	simplified_ingredients: true,
	halal_logo_id: true,
	variant_group: true,
	halal_logos: { select: { halal_logo: { select: { id: true, certifier: true, is_accredited: true } } } },
} as const
