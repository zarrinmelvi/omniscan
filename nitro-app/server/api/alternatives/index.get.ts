import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'
import { determineDisallowedCatalogIngredients } from '../../lib/alternative-reasoning'
import { findAlternativeProducts } from '../../lib/alternative-matching'

export default defineEventHandler(async (event) => {
	const authUser = requireAuth(event)

	try {
		const userWithProfile = await prisma.user.findUnique({
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
				dietary_prof: { select: { halal_pref: true, custom_preferences: true }, orderBy: { updated_at: 'desc' }, take: 1 },
			},
		})

		const halalPref = userWithProfile?.dietary_prof?.[0]?.halal_pref ?? false

		const profile = {
			allergens: userWithProfile?.allergens ?? [],
			halalPref,
			customPreferences: userWithProfile?.dietary_prof?.[0]?.custom_preferences ?? [],
		}

		const { disallowedIngredientNames, details } = await determineDisallowedCatalogIngredients(profile)

		const alternatives = await findAlternativeProducts(disallowedIngredientNames, { requireHalalCertified: halalPref })

		return {
			success: true,
			alternatives,
			disallowed_ingredients: details,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to compute alternatives:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to compute alternatives.' })
	}
})
