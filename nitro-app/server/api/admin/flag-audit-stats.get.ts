import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	try {
		// 1. Allergen profile counts — how many users have each predefined allergen
		const predefinedAllergens = await prisma.allergen.findMany({
			where: { is_predefined: true },
			select: {
				id: true,
				name: true,
				_count: { select: { users: true } },
			},
		})

		const allergen_profile_counts = predefinedAllergens
			.map((a) => ({
				allergen_id: a.id,
				name: a.name,
				user_count: a._count.users,
			}))
			.sort((a, b) => b.user_count - a.user_count)

		// 2. Allergen flag counts — load all flagged scans once, then group in-memory
		const flaggedScans = await prisma.flaggedScan.findMany({
			select: {
				id: true,
				flag_reason: true,
				created_at: true,
				scan: {
					select: {
						product: {
							select: {
								id: true,
								product_name: true,
								brand_name: true,
							},
						},
					},
				},
			},
		})

		const allergen_flag_counts = predefinedAllergens.map((allergen) => {
			const nameLower = allergen.name.toLowerCase()
			const matching = flaggedScans.filter(
				(fs) => fs.flag_reason?.toLowerCase().includes(nameLower)
			)

			const flag_count = matching.length

			const last_flagged_at =
				matching.length > 0
					? matching.reduce((latest, fs) =>
							new Date(fs.created_at) > new Date(latest.created_at) ? fs : latest
					  ).created_at
					: null

			// Count by product_name to get top 3
			const productFreq = new Map<
				string,
				{ product_id: number | null; product_name: string; brand_name: string | null; flag_count: number }
			>()
			for (const fs of matching) {
				const prod = fs.scan?.product
				if (!prod) continue
				const key = prod.product_name ?? 'Unknown'
				const existing = productFreq.get(key)
				if (existing) {
					existing.flag_count++
				} else {
					productFreq.set(key, {
						product_id: prod.id,
						product_name: prod.product_name ?? 'Unknown',
						brand_name: prod.brand_name ?? null,
						flag_count: 1,
					})
				}
			}

			const top_products = Array.from(productFreq.values())
				.sort((a, b) => b.flag_count - a.flag_count)
				.slice(0, 3)

			return {
				allergen_id: allergen.id,
				name: allergen.name,
				flag_count,
				last_flagged_at,
				top_products,
			}
		}).sort((a, b) => b.flag_count - a.flag_count)

		// 3. Total active consumers
		const total_active_consumers = await prisma.user.count({
			where: { deleted_at: null },
		})

		return {
			success: true,
			allergen_profile_counts,
			allergen_flag_counts,
			total_active_consumers,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to build flag audit stats:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch flag audit stats.' })
	}
})
