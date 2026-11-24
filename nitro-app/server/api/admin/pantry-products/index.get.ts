import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

/**
 * GET /api/admin/pantry-products
 *
 * Products Tab in "Manage Product Data". Lists every Product that at least one
 * consumer currently holds (or has held) in their pantry. Each row includes:
 *   - id, product_name, brand_name, category (from most common pantry category)
 *   - halal badge (certified / unverified / none)
 *   - allergens detected from scan flag_reasons
 *   - usage = number of distinct pantry items referencing this product
 *     (counts both current and previously-used items per spec)
 *
 * Query params:
 *   search   – filter by product_name or brand_name (case-insensitive)
 *   sort     – "most_used" (default) | "name_asc" | "name_desc"
 *   category – filter by category name, or "all" (default)
 *   page     – 1-based page number (default 1)
 *   limit    – page size (default 15, max 100)
 */

const ALLERGEN_KEYWORD_MAP: Array<{ keyword: string; label: string }> = [
	{ keyword: 'milk', label: 'Milk' },
	{ keyword: 'dairy', label: 'Milk' },
	{ keyword: 'egg', label: 'Eggs' },
	{ keyword: 'fish', label: 'Fish' },
	{ keyword: 'crustacean', label: 'Crustaceans' },
	{ keyword: 'shellfish', label: 'Crustaceans' },
	{ keyword: 'prawn', label: 'Crustaceans' },
	{ keyword: 'shrimp', label: 'Crustaceans' },
	{ keyword: 'mollusc', label: 'Molluscs' },
	{ keyword: 'peanut', label: 'Peanuts' },
	{ keyword: 'tree nut', label: 'Tree nuts' },
	{ keyword: 'nut', label: 'Tree nuts' },
	{ keyword: 'wheat', label: 'Wheat' },
	{ keyword: 'gluten', label: 'Wheat' },
	{ keyword: 'soy', label: 'Soy' },
	{ keyword: 'soya', label: 'Soy' },
	{ keyword: 'sesame', label: 'Sesame' },
	{ keyword: 'mustard', label: 'Mustard' },
	{ keyword: 'celery', label: 'Celery' },
	{ keyword: 'sulphite', label: 'Sulphites' },
	{ keyword: 'lupin', label: 'Lupin' },
]

function deriveAllergens(scans: Array<{ flag_reason: string | null }>): string[] {
	const labels: string[] = []
	for (const s of scans) {
		const reason = (s.flag_reason ?? '').toLowerCase()
		if (!reason) continue
		for (const { keyword, label } of ALLERGEN_KEYWORD_MAP) {
			if (reason.includes(keyword) && !labels.includes(label)) labels.push(label)
		}
	}
	return labels.slice(0, 4)
}

type HalalKind = 'certified' | 'unverified' | 'none'

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const q = getQuery(event)
	const search = typeof q.search === 'string' ? q.search.trim() : ''
	const sort = typeof q.sort === 'string' ? q.sort : 'most_used'
	const categoryFilter = typeof q.category === 'string' ? q.category.trim() : 'all'
	const page = Math.max(1, Number(q.page) || 1)
	const limit = Math.min(100, Math.max(1, Number(q.limit) || 15))

	try {
		// Find all products that have at least one pantry_item (current or used).
		// We include soft-deleted pantry items intentionally — per spec usage
		// counts items that have been used, not just currently active ones.
		const products = await prisma.product.findMany({
			where: {
				deleted_at: null,
				pantry_item: { some: {} },
			},
			select: {
				id: true,
				brand_name: true,
				product_name: true,
				image_thumb_base64: true,
				image_base64: true,
				halal_logo_id: true,
				halal_unverified: true,
				confirmed_not_halal: true,
				halal_logos: {
					where: { deleted_at: null },
					select: { halal_logo: { select: { certifier: true } } },
				},
				scan: { select: { flag_reason: true } },
				pantry_item: {
					// All pantry items — includes used/archived per spec
					select: {
						id: true,
						category: true,
						is_archived: true,
						deleted_at: true,
					},
				},
			},
		})

		type MappedRow = {
			id: number
			brand_name: string
			product_name: string
			thumb: string | null
			category: string
			halal_status: { label: string; kind: HalalKind }
			allergens: string[]
			usage: number
		}

		const rows: MappedRow[] = products.map((p) => {
			// Usage = total distinct pantry_item rows (current + used)
			const usage = p.pantry_item.length

			// Derive category: pick the most common non-null category across all items
			const catCounts: Record<string, number> = {}
			for (const item of p.pantry_item) {
				const cat = item.category ?? 'Uncategorized'
				catCounts[cat] = (catCounts[cat] ?? 0) + 1
			}
			const category = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Uncategorized'

			// Halal status
			const certifiers = p.halal_logos.map((l) => l.halal_logo?.certifier).filter(Boolean)
			let halal_status: { label: string; kind: HalalKind }
			if (certifiers.length > 0) {
				halal_status = { label: `Certified · ${certifiers[0]}`, kind: 'certified' }
			} else if (p.halal_unverified) {
				halal_status = { label: 'Unverified logo', kind: 'unverified' }
			} else {
				halal_status = { label: 'No Halal logo', kind: 'none' }
			}

			const thumb = p.image_thumb_base64
				? (p.image_thumb_base64.startsWith('data:') ? p.image_thumb_base64 : `data:image/jpeg;base64,${p.image_thumb_base64}`)
				: p.image_base64
				? (p.image_base64.startsWith('data:') ? p.image_base64 : `data:image/jpeg;base64,${p.image_base64}`)
				: null

			return {
				id: p.id,
				brand_name: p.brand_name,
				product_name: p.product_name,
				thumb,
				category,
				halal_status,
				allergens: deriveAllergens(p.scan),
				usage,
			}
		})

		// Search
		const searchLower = search.toLowerCase()
		let filtered = searchLower
			? rows.filter(
				(r) =>
					r.product_name.toLowerCase().includes(searchLower) ||
					r.brand_name.toLowerCase().includes(searchLower),
			)
			: rows

		// Category filter
		if (categoryFilter !== 'all') {
			filtered = filtered.filter((r) => r.category === categoryFilter)
		}

		// Sort
		if (sort === 'name_asc') {
			filtered.sort((a, b) => a.product_name.localeCompare(b.product_name))
		} else if (sort === 'name_desc') {
			filtered.sort((a, b) => b.product_name.localeCompare(a.product_name))
		} else {
			// most_used (default)
			filtered.sort((a, b) => b.usage - a.usage || a.product_name.localeCompare(b.product_name))
		}

		const total = filtered.length
		const start = (page - 1) * limit
		const pageSlice = filtered.slice(start, start + limit)

		// Distinct category list for the filter dropdown
		const allCategories = [...new Set(rows.map((r) => r.category))].sort()

		return {
			success: true,
			products: pageSlice,
			categories: allCategories,
			total,
			page,
			limit,
			total_pages: Math.max(1, Math.ceil(total / limit)),
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('[admin/pantry-products] Failed:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch products.' })
	}
})
