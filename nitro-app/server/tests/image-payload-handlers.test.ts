/**
 * Task 3.1 handler tests: list / POST / PUT / image fallback / scan.
 * prisma is mocked; no database or migration is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'

const state = vi.hoisted(() => ({
	user: { id: 1, email: 'u@test.dev' } as any,
	params: {} as Record<string, string>,
	body: {} as any,
	multipart: [] as any[],
	listItems: [] as any[],
	legacyIds: [] as number[],
	pantryRow: null as any,
	productUpdate: vi.fn(async (_args: any) => ({})),
	productCreateArgs: null as any,
	canonical: null as any,
	callOrder: [] as string[],
}))

vi.mock('../lib/prisma', () => {
	const prisma: any = {
		pantryItem: {
			count: vi.fn(async () => 0),
			findMany: vi.fn(async () => state.listItems),
			findUnique: vi.fn(async () => state.pantryRow),
			update: vi.fn(async () => ({
				...state.pantryRow,
				updated_at: new Date('2026-01-01'),
				product: { id: 5, brand_name: 'B', product_name: 'P', image_thumb_base64: 'data:image/jpeg;base64,T' },
			})),
			create: vi.fn(async (args: any) => ({
				id: 10,
				product: { id: 5, product_name: 'P', image_thumb_base64: 'data:image/jpeg;base64,T' },
			})),
		},
		product: {
			findUnique: vi.fn(async () => ({ id: 5, product_name: 'P' })),
			findMany: vi.fn(async () => state.legacyIds.map((id) => ({ id }))),
			update: (a: any) => state.productUpdate(a),
			create: vi.fn(async (args: any) => {
				state.productCreateArgs = args
				return { id: 5, product_name: 'P', brand_name: 'B', ingredient_text: 'x', simplified_ingredients: 'x', halal_logo_id: null, halal_unverified: false, canonical_product_id: args.data.canonical_product_id ?? null }
			}),
		},
		activityLog: { create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null) },
		notification: { create: vi.fn(async () => ({})) },
		recipe: { findMany: vi.fn(async () => []) },
		user: { findUnique: vi.fn(async () => ({ allergens: [], dietary_prof: [] })) },
		halalLogo: { findMany: vi.fn(async () => []) },
		catalogProduct: { findMany: vi.fn(async () => []) },
		productHalalLogo: { createMany: vi.fn(async () => ({})) },
		scan: { create: vi.fn(async () => ({ id: 77, safety_verdict: 'Yellow', flag_reason: 'x', scan_time: new Date(), ai_confidence_score: 0.7 })) },
		flaggedScan: { create: vi.fn(async () => ({})) },
		auditEvent: { count: vi.fn(async () => 0) },
		$queryRaw: vi.fn(async () => []),
	}
	return { prisma }
})

vi.mock('../utils/requireAuth', () => ({
	requireAuth: () => {
		if (!state.user) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
		return state.user
	},
}))
vi.mock('../lib/quota', () => ({ assertPantryQuotaAvailable: vi.fn(async () => {}) }))
vi.mock('../lib/product-dedup', () => ({
	buildCanonicalKey: (b: string, n: string) => `${b}|${n}`,
	findCanonicalProduct: vi.fn(async () => {
		state.callOrder.push('canonical')
		return state.canonical
	}),
}))
vi.mock('../lib/ollama-models', () => ({ OLLAMA_ENDPOINT: 'http://x', SCAN_VISION_MODEL: 'x' }))
vi.mock('../lib/alternative-reasoning', () => ({ determineDisallowedCatalogIngredients: vi.fn(async () => ({ disallowedIngredientNames: [] })) }))
vi.mock('../lib/alternative-matching', () => ({ findAlternativeProducts: vi.fn(async () => []) }))
vi.mock('../lib/admin-settings', () => ({ getAdminSettings: vi.fn(async () => ({ reviewConfidenceThreshold: 75, autoFlagThreshold: 90 })) }))
vi.mock('../utils/email', () => ({ sendNewFlagNotification: vi.fn(async () => {}) }))
vi.mock('../lib/audit-logger', () => ({ logAuditEvent: vi.fn(async () => {}) }))
vi.mock('../lib/logo-crop', () => ({ cropLogo: vi.fn(async () => null) }))

vi.mock('h3', async () => {
	const actual = await vi.importActual<any>('h3')
	return {
		...actual,
		getQuery: () => ({}),
		getRouterParam: (_e: any, k: string) => state.params[k],
		readBody: async () => state.body,
		readMultipartFormData: async () => state.multipart,
		setResponseStatus: () => {},
	}
})

import listHandler from '../api/pantry_item/index.get'
import postHandler from '../api/pantry_item/index.post'
import putHandler from '../api/pantry_item/[id].put'
import imageHandler from '../api/pantry_item/[id]/image.get'
import scanHandler from '../api/scan/index.post'

const THUMB = 'data:image/jpeg;base64,THUMB'

function row(id: number, productId: number, thumb: string | null) {
	return {
		id, quantity: 1, portion_unit: 'pcs', net_content: null, net_unit: null, pieces_count: 1,
		category: 'Dairy', storage_location: 'Fridge', expiration_date: new Date('2030-01-01'),
		best_before_date: null, is_archived: false, updated_at: new Date('2026-01-01'),
		product: { id: productId, product_name: 'P' + productId, brand_name: 'B', image_thumb_base64: thumb },
	}
}

async function jpeg(w: number, h: number, r: number): Promise<Buffer> {
	return sharp({ create: { width: w, height: h, channels: 3, background: { r, g: 10, b: 10 } } }).jpeg().toBuffer()
}

beforeEach(() => {
	state.params = {}
	state.legacyIds = []
	state.productUpdate.mockClear()
	state.canonical = null
	state.callOrder = []
	state.productCreateArgs = null
})

describe('GET /api/pantry_item', () => {
	it('returns thumbnail as image_base64 and flags legacy rows with needs_image', async () => {
		state.listItems = [row(1, 11, THUMB), row(2, 12, null)]
		state.legacyIds = [12]
		const res: any = await (listHandler as any)({})
		expect(res.items[0].product).toEqual({ id: 11, product_name: 'P11', brand_name: 'B', image_base64: THUMB, needs_image: false })
		expect(res.items[1].product).toEqual({ id: 12, product_name: 'P12', brand_name: 'B', image_base64: null, needs_image: true })
		expect(res.pagination).toBeTruthy()
		expect(JSON.stringify(res)).not.toContain('AAAA')
	})
})

describe('POST /api/pantry_item', () => {
	it('manual add stores a thumbnail and returns only the thumbnail', async () => {
		const buf = await jpeg(1200, 900, 200)
		state.body = {
			product_name: 'Manual', image_base64: `data:image/jpeg;base64,${buf.toString('base64')}`,
			expiration_date: '2030-01-01', storage_location: 'Fridge', pieces_count: 1,
		}
		const res: any = await (postHandler as any)({})
		expect(state.productCreateArgs.data.image_thumb_base64).toMatch(/^data:image\/jpeg;base64,/)
		expect(res.item.product.image_base64).toBe('data:image/jpeg;base64,T')
		expect(res.item.product).not.toHaveProperty('image_thumb_base64')
	})
})

describe('PUT /api/pantry_item/:id', () => {
	it('returns the thumbnail as product.image_base64', async () => {
		state.params = { id: '1' }
		state.body = { is_archived: false }
		state.pantryRow = { id: 1, user_id: 1, deleted_at: null, is_archived: false, pieces_count: 1, quantity: 1, portion_unit: 'pcs', category: 'Dairy', storage_location: 'Fridge', net_content: null, net_unit: null, expiration_date: null, best_before_date: null, product: { id: 5, product_name: 'P' } }
		const res: any = await (putHandler as any)({})
		expect(res.item.product).toEqual({ id: 5, brand_name: 'B', product_name: 'P', image_base64: 'data:image/jpeg;base64,T' })
	})
})

describe('GET /api/pantry_item/:id/image', () => {
	const make = (over: any = {}) => ({ user_id: 1, deleted_at: null, product: { id: 5, image_base64: null, image_thumb_base64: null, ...over } })

	it('404 when missing, 403 when not owner', async () => {
		state.params = { id: '1' }
		state.pantryRow = null
		await expect((imageHandler as any)({})).rejects.toMatchObject({ statusCode: 404 })
		state.pantryRow = { ...make(), user_id: 2 }
		await expect((imageHandler as any)({})).rejects.toMatchObject({ statusCode: 403 })
	})

	it('401 when unauthenticated', async () => {
		state.params = { id: '1' }
		const saved = state.user
		state.user = null
		try {
			await expect((imageHandler as any)({})).rejects.toMatchObject({ statusCode: 401 })
		} finally {
			state.user = saved
		}
	})

	it('returns existing thumbnail without writing', async () => {
		state.params = { id: '1' }
		state.pantryRow = make({ image_thumb_base64: THUMB })
		const res: any = await (imageHandler as any)({})
		expect(res).toEqual({ success: true, image_base64: THUMB })
		expect(state.productUpdate).not.toHaveBeenCalled()
	})

	it('generates and persists the thumbnail when missing', async () => {
		state.params = { id: '1' }
		const buf = await jpeg(1000, 800, 120)
		state.pantryRow = make({ image_base64: `data:image/jpeg;base64,${buf.toString('base64')}` })
		const res: any = await (imageHandler as any)({})
		expect(res.image_base64).toMatch(/^data:image\/jpeg;base64,/)
		expect(state.productUpdate).toHaveBeenCalledWith({ where: { id: 5 }, data: { image_thumb_base64: res.image_base64 } })
	})
})

describe('POST /api/scan', () => {
	it('thumbnails the front image (2nd upload when front_image_index=1) and keeps the canonical result', async () => {
		const a = await jpeg(900, 600, 250)
		const b = await jpeg(600, 900, 10)
		state.canonical = { id: 99, ingredient_text: 'canon', simplified_ingredients: 'canon' }
		state.multipart = [
			{ name: 'image', filename: 'a.jpg', type: 'image/jpeg', data: a },
			{ name: 'image_back', filename: 'b.jpg', type: 'image/jpeg', data: b },
			{ name: 'mock_ingredients', data: Buffer.from('water, sugar') },
		]
		const res: any = await (scanHandler as any)({})
		// mock path => front_image_index 0 => thumb comes from the first upload (landscape)
		const meta = await sharp(Buffer.from(res.scan.product.image_base64.split(',')[1], 'base64')).metadata()
		expect(meta.width!).toBeGreaterThan(meta.height!)
		expect(res.scan.product.image_base64_back).toBeNull()
		expect(res.scan.product.canonical_product_id).toBe(99)
		expect(res.scan.product.is_duplicate).toBe(true)
		expect(state.productCreateArgs.data.image_base64).toContain('data:image/jpeg;base64,')
		expect(state.productCreateArgs.data.image_thumb_base64).toBe(res.scan.product.image_base64)
		expect(state.productCreateArgs.select.image_base64).toBeUndefined()
		expect(state.productCreateArgs.select.image_base64_back).toBeUndefined()
		expect(state.callOrder).toContain('canonical')
	})
})
