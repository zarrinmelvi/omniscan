import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { findMatchingIngredientLine, type RawIngredient } from '../../lib/recipe-matching'
import { findMatchedUserAllergens, matchUserAllergensSemantically, mergeMatchedAllergens } from '../../lib/allergen-matching'
import { matchCatalogProduct, CATALOG_PRODUCT_SELECT } from '../../lib/catalog-matching'
import { determineDisallowedCatalogIngredients } from '../../lib/alternative-reasoning'
import { findAlternativeProducts } from '../../lib/alternative-matching'

const RECIPE_USAGE_LIMIT = 5

function coerceRawIngredients(value: unknown): RawIngredient[] {
	if (!Array.isArray(value)) return []
	return value
		.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
		.map((item) => ({
			name: typeof item.name === 'string' ? item.name : '',
			quantity: typeof item.quantity === 'number' ? item.quantity : null,
			unit: typeof item.unit === 'string' ? item.unit : null,
		}))
		.filter((i) => i.name.trim().length > 0)
}

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	const idParam = getRouterParam(event, 'id')
	const itemId = Number(idParam)

	if (!idParam || isNaN(itemId)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid pantry item id is required.' })
	}

	try {
		const item = await prisma.pantryItem.findUnique({
			where: { id: itemId },
			include: {
				product: {
					select: {
						id: true,
						product_name: true,
						brand_name: true,
						image_base64: true,
						ingredient_text: true,
						simplified_ingredients: true,
						halal_logo_id: true,
						confirmed_not_halal: true,
						halal_unverified: true,
					},
				},
			},
		})

		if (!item || item.deleted_at) {
			throw createError({ statusCode: 404, statusMessage: 'Pantry item not found.' })
		}

		if (item.user_id !== authUser.id) {
			throw createError({ statusCode: 403, statusMessage: 'You do not have access to this pantry item.' })
		}

		// Re-run allergen matching live against the user's CURRENT profile,
		// same functions scan/index.post.ts uses — deliberately not trusting
		// a stored snapshot from whenever this item was originally scanned,
		// since the user's allergens may have changed since then.
		const userWithAllergens = await prisma.user.findUnique({
			where: { id: authUser.id },
			select: {
				allergens: {
					select: {
						id: true,
						name: true,
						scientific_name: true,
						ingredient_mapping: { select: { scientific_term: true, simplified_term: true } },
					},
				},
			},
		})

		const combinedIngredientText = `${item.product.ingredient_text} ${item.product.simplified_ingredients}`
		const stringMatches = findMatchedUserAllergens(combinedIngredientText, userWithAllergens?.allergens ?? [])
		const semanticMatches = await matchUserAllergensSemantically(combinedIngredientText, userWithAllergens?.allergens ?? [])
		const matchedUserAllergens = mergeMatchedAllergens(stringMatches, semanticMatches)

		const halalLinks = await prisma.productHalalLogo.findMany({
			where: { product_id: item.product.id },
			select: { halal_logo: { select: { certifier: true } } },
		})
		const halal_certifiers = halalLinks.map((l) => l.halal_logo.certifier)

		const userWithProfile = await prisma.user.findUnique({
			where: { id: authUser.id },
			select: {
				dietary_prof: { select: { halal_pref: true, custom_preferences: true } },
			},
		})
		const halalPref = userWithProfile?.dietary_prof?.[0]?.halal_pref ?? false

		const catalogProducts = await prisma.catalogProduct.findMany({
			where: { is_verified: true },
			select: CATALOG_PRODUCT_SELECT,
		})

		const catalogMatch = matchCatalogProduct(
			{
				brand: item.product.brand_name,
				product_name: item.product.product_name,
			},
			catalogProducts,
		)

		let alternatives: Awaited<ReturnType<typeof findAlternativeProducts>> = []
		let alternativesMessage: string | null = null

		if (catalogMatch?.variant_group) {
			const dietaryProfile = {
				allergens: userWithAllergens?.allergens ?? [],
				halalPref,
				customPreferences: userWithProfile?.dietary_prof?.[0]?.custom_preferences ?? [],
			}

			const { disallowedIngredientNames } = await determineDisallowedCatalogIngredients(dietaryProfile)

			alternatives = await findAlternativeProducts(disallowedIngredientNames, {
				variantGroup: catalogMatch.variant_group,
				excludeProductId: catalogMatch.id,
				requireHalalCertified: halalPref,
			})

			if (alternatives.length === 0) {
				alternativesMessage = 'No safe alternatives available for this product based on your preferences.'
			}
		} else {
			alternativesMessage = 'No known alternatives for this product yet.'
		}

		const madeInteractions = await prisma.recipeInteraction.findMany({
			where: { user_id: authUser.id, made_at: { not: null } },
			select: {
				made_at: true,
				recipe: { select: { id: true, name: true, raw_ingredients: true } },
			},
			orderBy: { made_at: 'desc' },
		})

		const recipesUsingThis: {
			recipe_id: number
			recipe_name: string
			made_at: string
			used_quantity: number | null
			used_unit: string | null
		}[] = []

		for (const interaction of madeInteractions) {
			const ingredients = coerceRawIngredients(interaction.recipe.raw_ingredients)
			const matchedLine = findMatchingIngredientLine(item.product.product_name, ingredients)
			if (!matchedLine) continue

			recipesUsingThis.push({
				recipe_id: interaction.recipe.id,
				recipe_name: interaction.recipe.name,
				made_at: interaction.made_at!.toISOString(),
				used_quantity: matchedLine.quantity,
				used_unit: matchedLine.unit,
			})

			if (recipesUsingThis.length >= RECIPE_USAGE_LIMIT) break
		}

		return {
			success: true,
			item: {
				id: item.id,
				quantity: Number(item.quantity),
				portion_unit: item.portion_unit,
				storage_location: item.storage_location,
				expiration_date: item.expiration_date ? item.expiration_date.toISOString() : null,
				best_before_date: item.best_before_date ? item.best_before_date.toISOString() : null,
				is_archived: item.is_archived,
				updated_at: item.updated_at.toISOString(),
				product: { ...item.product, halal_certifiers },
				matched_user_allergens: matchedUserAllergens.map((a) => a.name),
				recipes_using_this: recipesUsingThis,
				alternatives,
				alternatives_message: alternativesMessage,
			},
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch pantry item:', err)
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to fetch pantry item.' })
	}
})
