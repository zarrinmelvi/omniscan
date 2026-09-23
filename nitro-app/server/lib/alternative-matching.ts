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
 * ingredient names. Applies TWO safety layers:
 *
 * Layer 1 (DB-level): filters via CatalogProductIngredient rows — excludes
 * products that have a linked CatalogIngredient matching a disallowed name.
 *
 * Layer 2 (post-query): filters via allergens_declared — excludes any product
 * whose declared allergen list contains any disallowed name as a case-insensitive
 * substring. This catches cases where CatalogIngredient links are incomplete.
 *
 * @param disallowedIngredientNames - e.g. ["milk", "milk powder"].
 *   Empty array returns every verified catalog product (no restrictions).
 * @param options.excludeProductId - omit a specific CatalogProduct from results.
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
 * @param options.variantGroup - restrict to a specific variant group.
 * @param options.limit - default 20.
 */
export async function findAlternativeProducts(
	disallowedIngredientNames: string[],
	options: {
		excludeProductId?: number
		onlyVerified?: boolean
		requireHalalCertified?: boolean
		variantGroup?: string
		limit?: number
	} = {},
): Promise<AlternativeMatch[]> {
	const { excludeProductId, onlyVerified = true, requireHalalCertified = false, variantGroup, limit = 20 } = options

	const normalizedDisallowed = disallowedIngredientNames.map((name) => name.toLowerCase().trim()).filter((name) => name.length > 0)

	// Fetch a larger set than `limit` to allow post-query filtering to still
	// return enough results after the allergens_declared pass removes some rows.
	const fetchLimit = limit * 3

	const results = await prisma.catalogProduct.findMany({
		where: {
			...(onlyVerified ? { is_verified: true } : {}),
			...(excludeProductId ? { id: { not: excludeProductId } } : {}),
			...(requireHalalCertified ? { halal_logo_id: { not: null } } : {}),
			...(variantGroup ? { variant_group: variantGroup } : {}),
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
			allergens_declared: true,
		},
		take: fetchLimit,
	})

	// Layer 2: post-query allergens_declared safety filter.
	// Removes any product whose declared allergen label contains any disallowed
	// name as a case-insensitive substring (e.g. disallowed "milk" matches
	// declared "Milk", "Skim Milk", "Milk Products").
	const safeResults =
		normalizedDisallowed.length > 0
			? results.filter((product) => {
					const declaredLower = product.allergens_declared.map((a) => a.toLowerCase())
					return !normalizedDisallowed.some((disallowed) =>
						declaredLower.some((declared) => declared.includes(disallowed) || disallowed.includes(declared)),
					)
				})
			: results

	// Return only the AlternativeMatch fields, capped at the original limit.
	return safeResults.slice(0, limit).map(({ allergens_declared: _drop, ...rest }) => rest)
}
