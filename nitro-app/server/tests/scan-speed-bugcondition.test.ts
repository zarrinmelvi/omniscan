/**
 * Task 1: Bug condition exploration tests (backend).
 *
 * These encode the EXPECTED behavior and are supposed to FAIL on unfixed code.
 *
 * Covers D1 (heavy image payloads in list / scan / create) and D3 (processed
 * pantry items matched as plain recipe ingredients).
 *
 * Validates: Requirements 1.1, 1.2, 1.6 (expected: 2.1, 2.2, 2.6)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// Mocks (hoisted). The prisma mock honours `select` so the test reflects what
// the handler actually asks the database for.
// ---------------------------------------------------------------------------
const state = vi.hoisted(() => ({
	bigImage: '',
	productRow: {} as Record<string, any>,
	lastProductCreateData: null as any,
	multipart: [] as any[],
	body: {} as any,
}))

function pick(row: Record<string, any>, select?: Record<string, any>) {
	if (!select) return { ...row }
	const out: Record<string, any> = {}
	for (const k of Object.keys(select)) if (select[k]) out[k] = row[k]
	return out
}

vi.mock('../lib/prisma', () => {
	const prisma: any = {
		pantryItem: {
			count: vi.fn(async () => 0),
			findMany: vi.fn(async (args: any) => {
				if (args?.include?.product) {
					return [
						{
							id: 1,
							quantity: 1,
							portion_unit: 'pcs',
							net_content: null,
							net_unit: null,
							pieces_count: 1,
							category: 'Beverages',
							storage_location: 'Fridge',
							expiration_date: new Date('2030-01-01'),
							best_before_date: null,
							is_archived: false,
							updated_at: new Date('2026-01-01'),
							product: pick(state.productRow, args.include.product.select),
						},
					]
				}
				return []
			}),
			create: vi.fn(async (args: any) => ({
				id: 10,
				product_id: 5,
				user_id: 1,
				category: 'Beverages',
				product: pick(state.productRow, args.include?.product?.select),
			})),
		},
		product: {
			findUnique: vi.fn(async () => ({ id: 5, product_name: 'Lemon Iced Tea' })),
			findMany: vi.fn(async () => []),
			create: vi.fn(async (args: any) => {
				state.lastProductCreateData = args.data
				const row = { id: 5, halal_logo_id: null, halal_unverified: false, canonical_product_id: null, ...args.data }
				return pick(row, args.select)
			}),
		},
		activityLog: { create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null) },
		notification: { create: vi.fn(async () => ({})) },
		user: { findUnique: vi.fn(async () => ({ allergens: [], dietary_prof: [] })) },
		halalLogo: { findMany: vi.fn(async () => []) },
		catalogProduct: { findMany: vi.fn(async () => []) },
		productHalalLogo: { createMany: vi.fn(async () => ({})) },
		scan: {
			create: vi.fn(async () => ({
				id: 77,
				safety_verdict: 'Yellow',
				flag_reason: 'Contains sugar',
				scan_time: new Date(),
				ai_confidence_score: 0.7,
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
vi.mock('../lib/alternative-reasoning', () => ({ determineDisallowedCatalogIngredients: vi.fn(async () => ({ disallowedIngredientNames: [] })) }))
vi.mock('../lib/alternative-matching', () => ({ findAlternativeProducts: vi.fn(async () => []) }))
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
		readBody: async () => state.body,
		readMultipartFormData: async () => state.multipart,
		setResponseStatus: () => {},
	}
})

import pantryListHandler from '../api/pantry_item/index.get'
import pantryCreateHandler from '../api/pantry_item/index.post'
import scanHandler from '../api/scan/index.post'
import { matchIngredientsToPantry } from '../lib/recipe-matching'

const LIMIT = 50 * 1024

/** Collect every string value (deeply) in a JSON-like value. */
function allStrings(value: unknown, out: string[] = []): string[] {
	if (typeof value === 'string') out.push(value)
	else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out))
	else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out))
	return out
}
const longest = (v: unknown) => Math.max(0, ...allStrings(v).map((s) => s.length))

async function jpegDataUri(w: number, h: number): Promise<string> {
	// Noisy image so the JPEG is genuinely large.
	const raw = Buffer.alloc(w * h * 3)
	for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24
	const buf = await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 90 }).toBuffer()
	return `data:image/jpeg;base64,${buf.toString('base64')}`
}

beforeEach(() => {
	state.bigImage = 'data:image/jpeg;base64,' + 'A'.repeat(500 * 1024)
	state.productRow = {
		id: 5,
		product_name: 'Lemon Iced Tea',
		brand_name: 'Acme',
		image_base64: state.bigImage,
		image_thumb_base64: 'data:image/jpeg;base64,THUMB',
	}
	state.lastProductCreateData = null
})

describe('D1 heavy payloads', () => {
	it('GET /api/pantry_item: no string in the response exceeds 50 KB', async () => {
		const res: any = await (pantryListHandler as any)({})
		expect(longest(res)).toBeLessThan(LIMIT)
	})

	it('POST /api/pantry_item: response carries no full-size image', async () => {
		state.body = {
			product_id: 5,
			expiration_date: '2030-01-01',
			storage_location: 'Fridge',
			pieces_count: 1,
		}
		const res: any = await (pantryCreateHandler as any)({})
		expect(longest(res)).toBeLessThan(LIMIT)
	})

	it('POST /api/scan: image_base64 is a thumbnail (<=320px) and image_base64_back is null', async () => {
		const front = await jpegDataUri(1600, 1200)
		const back = await jpegDataUri(1600, 1200)
		const toBuf = (u: string) => Buffer.from(u.split(',')[1], 'base64')
		state.multipart = [
			{ name: 'image', filename: 'front.jpg', type: 'image/jpeg', data: toBuf(front) },
			{ name: 'image_back', filename: 'back.jpg', type: 'image/jpeg', data: toBuf(back) },
			{ name: 'mock_ingredients', data: Buffer.from('water, sugar') },
		]
		const res: any = await (scanHandler as any)({})
		const product = res.scan.product

		expect(product.image_base64_back).toBeNull()
		expect(typeof product.image_base64).toBe('string')
		const b64 = (product.image_base64 as string).split(',')[1]
		const meta = await sharp(Buffer.from(b64, 'base64')).metadata()
		expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(320)
	})
})

describe('D3 processed items matched as plain ingredients', () => {
	const ing = (name: string) => [{ name, quantity: null, unit: null }]
	const pantry = (product_name: string, category: string | null): any[] => [{ id: 1, product_name, category }]

	it.each([
		['lemon', 'Lemon Iced Tea', 'Beverages'],
		['lemon', 'Lemon Flavored Chips', 'Snacks'],
		['lemon', 'Sprite Lemon', 'Beverages'],
		['lemon', 'Lemon Sauce', 'Condiments & Sauces'],
	])('"%s" must NOT be satisfied by "%s" (%s)', (ingredient, productName, category) => {
		const result = matchIngredientsToPantry(ing(ingredient), pantry(productName, category))
		expect(result.matchedIngredientNames).toEqual([])
		expect(result.matchedPantryItemIds).toEqual([])
	})

	it('property: flavor word in a processed-category product name never matches as the plain ingredient', () => {
		const flavors = fc.constantFrom('lemon', 'orange', 'strawberry', 'chocolate', 'mango')
		const drinkOrSnack = fc.constantFrom(
			{ category: 'Beverages', suffix: 'iced tea' },
			{ category: 'Beverages', suffix: 'soda' },
			{ category: 'Snacks', suffix: 'flavored chips' },
			{ category: 'Instant Noodles', suffix: 'flavored noodles' },
			{ category: 'Condiments & Sauces', suffix: 'sauce' },
		)
		fc.assert(
			fc.property(flavors, drinkOrSnack, fc.boolean(), (flavor, { category, suffix }, flavorFirst) => {
				const name = flavorFirst ? `${flavor} ${suffix}` : `Acme ${suffix} ${flavor}`
				const result = matchIngredientsToPantry(ing(flavor), pantry(name, category))
				expect(result.matchedIngredientNames).toEqual([])
			}),
			{ numRuns: 50 },
		)
	})
})
