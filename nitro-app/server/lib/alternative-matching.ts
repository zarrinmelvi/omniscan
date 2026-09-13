import { prisma } from './prisma'

export type AlternativeMatch = {
	id: number
	brand_name: string
	product_name: string
	is_verified: boolean
	halal_logo_id: number | null
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
 * @param options.onlyVerified - default true. The originally-flagged rows
 *   (is_verified=false) are excluded by default since their
 *   ingredient_text hasn't been confirmed against the physical label yet
 *   — surfacing an unverified product as a "safe" alternative is a real
 *   safety-critical risk, not just a data-quality one.
 * @param options.requireHalalCertified - default false. When true, only
 *   returns products with a CONFIRMED HalalLogo link (halal_logo_id NOT
 *   NULL) — a positive-certification requirement, not just "doesn't
 *   contain an obvious non-Halal keyword." Absence of a red-flag
 *   ingredient isn't the same as being actually Halal-certified (could
 *   still involve non-Halal slaughtering, cross-contamination, or an
 *   alcohol-derived flavoring the keyword check doesn't catch), so for
 *   users with Halal as an actual preference, this is the correct,
 *   stricter check to apply. This will return fewer (or zero) results
 *   until CatalogProduct rows actually have halal_logo_id populated —
 *   that's honest, correct behavior while that data-entry work is still
 *   in progress, not a bug.
 * @param options.limit - default 20.
 */
export async function findAlternativeProducts(
	disallowedIngredientNames: string[],
	options: {
		excludeProductId?: number
		onlyVerified?: boolean
		requireHalalCertified?: boolean
		limit?: number
	} = {},
): Promise<AlternativeMatch[]> {
	const { excludeProductId, onlyVerified = true, requireHalalCertified = false, limit = 20 } = options

	const normalizedDisallowed = disallowedIngredientNames.map((name) => name.toLowerCase().trim()).filter((name) => name.length > 0)

	const results = await prisma.catalogProduct.findMany({
		where: {
			...(onlyVerified ? { is_verified: true } : {}),
			...(excludeProductId ? { id: { not: excludeProductId } } : {}),
			...(requireHalalCertified ? { halal_logo_id: { not: null } } : {}),
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
			halal_logo_id: true,
		},
		take: limit,
	})

	return results
}
