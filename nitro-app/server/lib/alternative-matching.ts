import { prisma } from './prisma'

export type AlternativeMatch = {
	id: number
	brand_name: string
	product_name: string
	is_verified: boolean
}

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
