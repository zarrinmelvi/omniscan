// server/lib/alternative-matching.ts
//
// Deterministic half of the Alternatives feature: given a list of
// disallowed ingredient names, finds CatalogProduct rows that don't
// contain any of them. This is intentionally separate from the AI step
// that DECIDES what's disallowed for a given user (allergens, halal_pref,
// custom_preferences) — that reasoning isn't built yet. This function
// takes the disallowed list as a plain input so it can be tested and used
// right now with a stubbed list, and wired to the real AI-driven list
// later without changing this function's shape.
//
// Mirrors the pattern in server/lib/allergen-matching.ts: matching logic
// lives in its own lib file, callable from any endpoint that needs it.

import { prisma } from './prisma'

export type AlternativeMatch = {
	id: number
	brand_name: string
	product_name: string
	is_verified: boolean
}

/**
 * Returns catalog products containing NONE of the given disallowed
 * ingredient names. Matching is case-insensitive and exact against
 * CatalogIngredient.name (which is already stored lowercased/trimmed —
 * see parse-catalog-ingredients.ts) — so callers should pass already-
 * normalized names, not raw label text.
 *
 * @param disallowedIngredientNames - e.g. ["peanuts", "milk powder"].
 *   Empty array returns every verified catalog product (no restrictions).
 * @param options.excludeProductId - omit a specific CatalogProduct from
 *   results, e.g. to avoid suggesting the same product as its own
 *   alternative once product-to-catalog matching exists.
 * @param options.onlyVerified - default true. The 25 originally-flagged
 *   rows (is_verified=false) are excluded by default since their
 *   ingredient_text hasn't been confirmed against the physical label yet
 *   — surfacing an unverified product as a "safe" alternative is a real
 *   safety-critical risk, not just a data-quality one.
 * @param options.limit - default 20.
 */
export async function findAlternativeProducts(
	disallowedIngredientNames: string[],
	options: {
		excludeProductId?: number
		onlyVerified?: boolean
		limit?: number
	} = {},
): Promise<AlternativeMatch[]> {
	const { excludeProductId, onlyVerified = true, limit = 20 } = options

	const normalizedDisallowed = disallowedIngredientNames.map((name) => name.toLowerCase().trim()).filter((name) => name.length > 0)

	const results = await prisma.catalogProduct.findMany({
		where: {
			...(onlyVerified ? { is_verified: true } : {}),
			...(excludeProductId ? { id: { not: excludeProductId } } : {}),
			// No linked ingredient may match any disallowed name.
			...(normalizedDisallowed.length > 0
				? {
						ingredients: {
							none: {
								catalog_ingredient: {
									name: { in: normalizedDisallowed },
								},
							},
						},
					}
				: {}),
		},
		select: {
			id: true,
			brand_name: true,
			product_name: true,
			is_verified: true,
		},
		take: limit,
	})

	return results
}
