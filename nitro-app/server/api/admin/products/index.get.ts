import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../../lib/prisma'
import { requireAdminAuth } from '../../../utils/requireAdminAuth'

// Lowercased keyword → canonical allergen display label. Scanned against each
// scan's flag_reason to derive the "allergens detected" chips for a product.
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
	{ keyword: 'tree nut', label: 'Tree nuts' },
	{ keyword: 'peanut', label: 'Peanuts' },
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

type HalalKind = 'certified' | 'unverified' | 'none'

interface ProductRow {
	id: number
	brand_name: string
	product_name: string
	thumb: string | null
	scan_count: number
	halal_status: { label: string; kind: HalalKind }
	allergens_detected: string[]
	possible_duplicate: boolean
	canonical_key: string | null
	canonical_product_id: number | null
	updated_at: Date
	pantry_count: number
	category: string
}

function deriveAllergens(scans: Array<{ flag_reason: string | null }>): string[] {
	const labels: string[] = []
	for (const s of scans) {
		const reason = (s.flag_reason ?? '').toLowerCase()
		if (!reason) continue
		for (const { keyword, label } of ALLERGEN_KEYWORD_MAP) {
			if (reason.includes(keyword) && !labels.includes(label)) {
				labels.push(label)
			}
		}
	}
	return labels.slice(0, 4)
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const search = typeof query.search === 'string' ? query.search.trim() : ''
	const filter = typeof query.filter === 'string' ? query.filter : 'all'
	const sort = typeof query.sort === 'string' ? query.sort : 'name_asc'
	const page = Math.max(1, Number(query.page) || 1)
	const limit = Math.max(1, Number(query.limit) || 10)
	// Products tab extras
	const pantryOnly = query.pantry_only === 'true' || query.pantry_only === '1'
	const categoryFilter = typeof query.category_filter === 'string' ? query.category_filter.trim() : 'all'
	const highlightId = query.highlight_id ? parseInt(String(query.highlight_id), 10) : null

	try {
		// Build the set of canonical_keys shared by >= 2 non-deleted products so we
		// can flag possible duplicates without an N+1 query per product.
		const grouped = await prisma.product.groupBy({
			by: ['canonical_key'],
			where: { deleted_at: null, canonical_key: { not: null } },
			_count: { _all: true },
		})
		const duplicateKeys = new Set<string>(
			grouped
				.filter((g) => (g._count?._all ?? 0) >= 2 && g.canonical_key != null)
				.map((g) => g.canonical_key as string),
		)

		const products = await prisma.product.findMany({
			where: { deleted_at: null },
			select: {
				id: true,
				brand_name: true,
				product_name: true,
				image_base64: true,
				halal_logo_id: true,
				halal_unverified: true,
				confirmed_not_halal: true,
				canonical_key: true,
				canonical_product_id: true,
				updated_at: true,
				halal_logo: { select: { certifier: true } },
				halal_logos: {
					where: { deleted_at: null },
					select: { halal_logo: { select: { certifier: true } } },
				},
				scan: { select: { id: true, safety_verdict: true, flag_reason: true } },
				_count: { select: { scan: true } },
				pantry_item: {
					where: { deleted_at: null },
					select: { category: true },
				},
			},
		})

		const mapped: ProductRow[] = products.map((p) => {
			// halal_status derivation
			const firstCertifier = p.halal_logos.length > 0
				? (p.halal_logos[0].halal_logo?.certifier ?? p.halal_logo?.certifier ?? null)
				: null
			let halal_status: { label: string; kind: HalalKind }
			if (p.halal_logos.length > 0 && firstCertifier) {
				halal_status = { label: `Certified · ${firstCertifier}`, kind: 'certified' }
			} else if (p.halal_logos.length > 0) {
				halal_status = { label: 'Certified', kind: 'certified' }
			} else if (p.confirmed_not_halal) {
				halal_status = { label: 'No Halal logo', kind: 'none' }
			} else if (p.halal_unverified) {
				halal_status = { label: 'Unverified logo', kind: 'unverified' }
			} else {
				halal_status = { label: 'No Halal logo', kind: 'none' }
			}

			const possible_duplicate = p.canonical_key != null && duplicateKeys.has(p.canonical_key)

			let thumb: string | null = null
			if (p.image_base64) {
				thumb = p.image_base64.startsWith('data:')
					? p.image_base64
					: `data:image/jpeg;base64,${p.image_base64}`
			}

			// Derive pantry_count and most-common category from pantry_item rows
			const pantryItems = p.pantry_item ?? []
			const pantry_count = pantryItems.length

			// Pick the most frequently used category among all pantry items for this product.
			// Falls back to 'Uncategorized' when no pantry items or all categories are null.
			let category = 'Uncategorized'
			if (pantryItems.length > 0) {
				const freq: Record<string, number> = {}
				for (const item of pantryItems) {
					const cat = item.category ?? 'Uncategorized'
					freq[cat] = (freq[cat] ?? 0) + 1
				}
				category = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
			}

			return {
				id: p.id,
				brand_name: p.brand_name,
				product_name: p.product_name,
				thumb,
				scan_count: p._count.scan,
				halal_status,
				allergens_detected: deriveAllergens(p.scan),
				possible_duplicate,
				canonical_key: p.canonical_key,
				canonical_product_id: p.canonical_product_id,
				updated_at: p.updated_at,
				pantry_count,
				category,
			}
		})

		// Apply search (name or brand, case-insensitive)
		const searchLower = search.toLowerCase()
		const searched = searchLower
			? mapped.filter(
				(r) =>
					r.product_name.toLowerCase().includes(searchLower) ||
					r.brand_name.toLowerCase().includes(searchLower),
			)
			: mapped

		// pantry_only=true: only products that appear in at least one pantry item.
		const pantryFiltered = pantryOnly
			? searched.filter((r) => r.pantry_count > 0)
			: searched

		// Filter-chip counts (computed after search, before the active filter)
		const total = pantryFiltered.length
		const duplicates_count = pantryFiltered.filter((r) => r.possible_duplicate).length
		const unverified_count = pantryFiltered.filter((r) => r.halal_status.kind === 'unverified').length

		// Apply active filter (existing catalog-mgmt filters)
		let filtered = pantryFiltered
		if (filter === 'duplicates') {
			filtered = pantryFiltered.filter((r) => r.possible_duplicate)
		} else if (filter === 'unverified') {
			filtered = pantryFiltered.filter((r) => r.halal_status.kind === 'unverified')
		}

		// Apply category filter (Products tab)
		if (categoryFilter && categoryFilter !== 'all') {
			filtered = filtered.filter((r) => r.category === categoryFilter)
		}

		// Apply sort
		const sorted = [...filtered]
		if (sort === 'most_used') {
			sorted.sort((a, b) => b.pantry_count - a.pantry_count)
		} else if (sort === 'name_desc') {
			sorted.sort((a, b) => b.product_name.localeCompare(a.product_name))
		} else if (sort === 'scans') {
			sorted.sort((a, b) => b.scan_count - a.scan_count)
		} else if (sort === 'newest') {
			sorted.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
		} else {
			// default: name_asc
			sorted.sort((a, b) => a.product_name.localeCompare(b.product_name))
		}

		const total_filtered = sorted.length
		const start = (page - 1) * limit
		const pageSlice = sorted.slice(start, start + limit)

		// If a highlight_id was supplied, tell the client which page it lives on
		// (given the current sort/filter) so the Products tab can jump there.
		let highlight_page: number | null = null
		if (highlightId != null && !Number.isNaN(highlightId)) {
			const idx = sorted.findIndex((r) => r.id === highlightId)
			if (idx >= 0) highlight_page = Math.floor(idx / limit) + 1
		}

		return {
			success: true,
			products: pageSlice,
			total_filtered,
			total,
			duplicates_count,
			unverified_count,
			page,
			limit,
			highlight_page,
		}
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Failed to fetch admin products:', err)
		throw createError({ statusCode: 400, statusMessage: 'Failed to fetch products.' })
	}
})
