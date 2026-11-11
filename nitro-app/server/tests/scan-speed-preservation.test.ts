/**
 * Task 2: Preservation tests (backend). Observed on UNFIXED code; must PASS
 * before and after the fix.
 *
 * Covers response shapes (everything except the documented image fields and the
 * additive `needs_image`) and the 9bef136 scan semantics.
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'

const state = vi.hoisted(() => ({
	productRow: {} as Record<string, any>,
	multipart: [] as any[],
	body: {} as any,
}))

function pick(row: Record<string, any>, select?: Record<string, any>) {
	if (!select) return { ...row }
	const out: Record<string, any> = {}
	for (const k of Object.keys(select)) if (select[k]) out[k] = row[k]
	return out
}

const pantryRow = (args: any) => ({
	id: 1,
	quantity: 2,
	portion_unit: 'pcs',
	net_content: null,
	net_unit: null,
	pieces_count: 2,
	category: 'Beverages',
	storage_location: 'Fridge',
	expiration_date: new Date('2030-01-01'),
	best_before_date: null,
	is_archived: false,
	deleted_at: null,
	user_id: 1,
	updated_at: new Date('2026-01-01'),
	product: pick(state.productRow, args?.include?.product?.select),
})

vi.mock('../lib/prisma', () => {
	const prisma: any = {
		pantryItem: {
			count: vi.fn(async () => 1),
			findMany: vi.fn(async (args: any) => (args?.include?.product ? [pantryRow(args)] : [])),
			findUnique: vi.fn(async () => ({ ...pantryRow({}), product: { id: 5, product_name: 'Lemon Iced Tea' } })),
			update: vi.fn(async (args: any) => pantryRow(args)),
			create: vi.fn(async (args: any) => ({ ...pantryRow(args), id: 10, product_id: 5, user_id: 1 })),
		},
		product: {
			findUnique: vi.fn(async () => ({ id: 5, product_name: 'Lemon Iced Tea' })),
			findMany: vi.fn(async () => []),
			create: vi.fn(async (args: any) => {
				const row = { id: 5, halal_logo_id: null, halal_unverified: false, canonical_product_id: null, ...args.data }
				return pick(row, args.select)
			}),
		},
		activityLog: { create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null) },
		notification: { create: vi.fn(async () => ({})) },
		user: {
			findUnique: vi.fn(async () => ({
				allergens: [
					{ id: 1, name: 'Milk', scientific_name: null, ingredient_mapping: [] },
					{ id: 2, name: 'Peanut', scientific_name: null, ingredient_mapping: [] },
				],
				dietary_prof: [{ halal_pref: false, custom_preferences: [] }],
			})),
		},
		halalLogo: { findMany: vi.fn(async () => []) },
		catalogProduct: { findMany: vi.fn(async () => []) },
		productHalalLogo: { createMany: vi.fn(async () => ({})) },
		scan: {
			create: vi.fn(async () => ({
				id: 77,
				safety_verdict: 'Red',
				flag_reason: 'Contains milk',
				scan_time: new Date(),
				ai_confidence_score: 1,
			})),
		},
		flaggedScan: { create: vi.fn(async () => ({})) },
		auditEvent: { count: vi.fn(async () => 0) },
		$queryRaw: vi.fn(async () => []),
	}
	return { prisma }
})

vi.mock('../utils/requireAuth', () => ({ requireAuth: () => ({ id: 1, email: 'u@test.dev' }) }))
vi.mock('../lib/quota', () => ({ assertPantryQuotaAvailable: vi.fn(async () => {}) }))
vi.mock('../lib/product-dedup', () => ({
	buildCanonicalKey: (b: string, n: string) => `${b}|${n}`,
	findCanonicalProduct: vi.fn(async () => null),
}))
vi.mock('../lib/ollama-models', () => ({ OLLAMA_ENDPOINT: 'http://x', SCAN_VISION_MODEL: 'x' }))
vi.mock('../lib/alternative-reasoning', () => ({
	determineDisallowedCatalogIngredients: vi.fn(async () => ({ disallowedIngredientNames: ['milk'] })),
}))
vi.mock('../lib/alternative-matching', () => ({ findAlternativeProducts: vi.fn(async () => [{ id: 2, name: 'Oat Drink' }]) }))
vi.mock('../lib/catalog-matching', () => ({
	CATALOG_PRODUCT_SELECT: {},
	matchCatalogProduct: vi.fn(() => ({
		id: 9,
		variant_group: 'g1',
		ingredient_text: 'x',
		simplified_ingredients: 'x',
		halal_logos: [],
	})),
}))
vi.mock('../lib/allergen-matching', () => ({
	findMatchedUserAllergens: vi.fn(() => [{ id: 1, name: 'Milk', confidence: 1 }]),
	matchUserAllergensSemantically: vi.fn(async () => []),
	mergeMatchedAllergens: (a: any[], b: any[]) => [...a, ...b],
}))
vi.mock('../lib/admin-settings', () => ({
	getAdminSettings: vi.fn(async () => ({ reviewConfidenceThreshold: 75, autoFlagThreshold: 90 })),
}))
vi.mock('../utils/email', () => ({ sendNewFlagNotification: vi.fn(async () => {}) }))
vi.mock('../lib/audit-logger', () => ({ logAuditEvent: vi.fn(async () => {}) }))
vi.mock('../lib/logo-crop', () => ({ cropLogo: vi.fn(async () => null) }))

vi.mock('h3', async () => {
	const actual = await vi.importActual<any>('h3')
	return {
		...actual,
		getQuery: () => ({}),
		getRouterParam: () => '1',
		readBody: async () => state.body,
		readMultipartFormData: async () => state.multipart,
		setResponseStatus: () => {},
	}
})

import pantryListHandler from '../api/pantry_item/index.get'
import pantryCreateHandler from '../api/pantry_item/index.post'
import pantryPutHandler from '../api/pantry_item/[id].put'
import scanHandler from '../api/scan/index.post'
import { prisma } from '../lib/prisma'
import { logAuditEvent } from '../lib/audit-logger'
import { matchUserAllergensSemantically } from '../lib/allergen-matching'
import { determineDisallowedCatalogIngredients } from '../lib/alternative-reasoning'

const IMAGE_FIELDS = ['image_base64', 'image_base64_back', 'needs_image']
const keysWithout = (o: Record<string, any>, drop: string[] = IMAGE_FIELDS) =>
	Object.keys(o).filter((k) => !drop.includes(k)).sort()

beforeEach(() => {
	vi.clearAllMocks()
	state.productRow = {
		id: 5,
		product_name: 'Lemon Iced Tea',
		brand_name: 'Acme',
		image_base64: 'data:image/jpeg;base64,FULL',
		image_thumb_base64: 'data:image/jpeg;base64,THUMB',
	}
})

describe('response shapes (non-image fields unchanged)', () => {
	it('GET /api/pantry_item keeps item keys, product keys and the pagination block', async () => {
		const res: any = await (pantryListHandler as any)({})
		expect(res.success).toBe(true)
		expect(Object.keys(res).sort()).toEqual(['items', 'pagination', 'success'])
		expect(Object.keys(res.pagination).sort()).toEqual(['currentPage', 'limit', 'totalItems', 'totalPages'])
		expect(res.pagination).toEqual({ currentPage: 1, totalPages: 1, totalItems: 1, limit: 1 })
		const item = res.items[0]
		expect(Object.keys(item).sort()).toEqual(
			[
				'best_before_date', 'category', 'expiration_date', 'id', 'is_archived', 'net_content', 'net_unit',
				'pieces_count', 'portion_unit', 'product', 'quantity', 'storage_location', 'updated_at',
			].sort(),
		)
		expect(keysWithout(item.product)).toEqual(['brand_name', 'id', 'product_name'])
		expect(item.product.product_name).toBe('Lemon Iced Tea')
		expect(item.expiration_date).toBe('2030-01-01T00:00:00.000Z')
	})

	it('POST /api/pantry_item keeps success + item keys and product id/name', async () => {
		state.body = { product_id: 5, expiration_date: '2030-01-01', storage_location: 'Fridge', pieces_count: 2 }
		const res: any = await (pantryCreateHandler as any)({})
		expect(res.success).toBe(true)
		expect(Object.keys(res).sort()).toEqual(['item', 'success'])
		expect(res.item.product.id).toBe(5)
		expect(res.item.product.product_name).toBe('Lemon Iced Tea')
		expect(keysWithout(res.item.product)).toEqual(['id', 'product_name'])
	})

	it('PUT /api/pantry_item/:id keeps the item keys and product id/brand/name', async () => {
		state.body = { is_archived: false, pieces_count: 2 }
		const res: any = await (pantryPutHandler as any)({})
		expect(res.success).toBe(true)
		expect(Object.keys(res).sort()).toEqual(['item', 'success'])
		expect(Object.keys(res.item).sort()).toEqual(
			[
				'best_before_date', 'category', 'expiration_date', 'id', 'is_archived', 'net_content', 'net_unit',
				'pieces_count', 'portion_unit', 'product', 'quantity', 'storage_location', 'updated_at',
			].sort(),
		)
		expect(keysWithout(res.item.product)).toEqual(['brand_name', 'id', 'product_name'])
	})
})

describe('POST /api/scan: response shape and 9bef136 semantics', () => {
	let fetchMock: ReturnType<typeof vi.fn>

	async function runScan() {
		const img = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#888' } }).jpeg().toBuffer()
		state.multipart = [{ name: 'image', filename: 'front.jpg', type: 'image/jpeg', data: img }]
		fetchMock = vi.fn(async () => ({
			message: {
				content: JSON.stringify({
					is_food_product: true,
					is_real_photo: true,
					front_image_index: 0,
					product_name: 'Choco Milk',
					brand: 'Acme',
					ingredients_text: 'milk, sugar',
					simplified_ingredients: 'milk, sugar',
					halal_logo_detected: false,
					certifying_body: '',
					halal_certifier_confidence: 0,
					halal_logo_box: null,
					expiration_date: null,
					net_quantity: 500,
					net_unit: 'ml',
					food_category: 'Beverages',
				}),
			},
		}))
		vi.stubGlobal('$fetch', fetchMock)
		return (await (scanHandler as any)({})) as any
	}

	it('keeps every response field other than the image fields', async () => {
		const res = await runScan()
		expect(Object.keys(res).sort()).toEqual(['scan', 'success'])
		expect(Object.keys(res.scan).sort()).toEqual(
			['alternatives', 'alternatives_message', 'flag_reason', 'halal', 'matched_user_allergens', 'product', 'safety_verdict', 'scan_time'].sort(),
		)
		expect(keysWithout(res.scan.product)).toEqual(
			[
				'brand_name', 'canonical_product_id', 'expiration_date_detected', 'food_category', 'halal_logo_id',
				'halal_unverified', 'id', 'ingredient_text', 'is_duplicate', 'net_quantity_detected',
				'net_unit_detected', 'product_name', 'simplified_ingredients',
			].sort(),
		)
		expect(Object.keys(res.scan.product)).toContain('image_base64')
		expect(Object.keys(res.scan.product)).toContain('image_base64_back')
		expect(res.scan.product.food_category).toBe('Beverages')
		expect(res.scan.product.net_quantity_detected).toBe(500)
		expect(res.scan.safety_verdict).toBe('Red')
		expect(res.scan.matched_user_allergens).toEqual(['Milk'])
		expect(Object.keys(res.scan.halal).sort()).toEqual(
			['certifiers', 'certifying_body', 'is_accredited', 'known_certifier', 'logo_detected', 'matched_known_logo'].sort(),
		)
	})

	it('only sends plain-text-unmatched allergens to the semantic call, with the 8s timeout', async () => {
		await runScan()
		const calls = (matchUserAllergensSemantically as any).mock.calls
		expect(calls).toHaveLength(1)
		expect(calls[0][1].map((a: any) => a.id)).toEqual([2])
		expect(calls[0][2]).toEqual({ timeoutMs: 8000 })
	})

	it('starts alternatives before the product is saved and returns them in the response', async () => {
		const res = await runScan()
		const altOrder = (determineDisallowedCatalogIngredients as any).mock.invocationCallOrder[0]
		const createOrder = (prisma as any).product.create.mock.invocationCallOrder[0]
		expect(altOrder).toBeLessThan(createOrder)
		expect(res.scan.alternatives).toEqual([{ id: 2, name: 'Oat Drink' }])
		expect(res.scan.alternatives_message).toBeNull()
	})

	it('writes the SCAN audit event and the "scanned" activity log, and the FLAG audit + FlaggedScan', async () => {
		await runScan()
		const events = (logAuditEvent as any).mock.calls.map((c: any[]) => c[0].event_type)
		expect(events).toContain('SCAN')
		expect(events).toContain('FLAG')
		expect((prisma as any).activityLog.create).toHaveBeenCalledTimes(1)
		expect((prisma as any).activityLog.create.mock.calls[0][0].data.type).toBe('scanned')
		expect((prisma as any).flaggedScan.create).toHaveBeenCalledTimes(1)
	})

	it('still stores the full-size front image on the product', async () => {
		await runScan()
		const data = (prisma as any).product.create.mock.calls[0][0].data
		expect(data.image_base64).toMatch(/^data:image\/jpeg;base64,/)
		expect(data.is_verified).toBe(false)
	})
})
