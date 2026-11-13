/**
 * Task 5 — Bug 2: Preservation Tests (MUST PASS on unfixed AND fixed code)
 *
 * These tests document the CORRECT baseline behavior that must be preserved
 * after the fix is applied. Observed and confirmed on unfixed code first.
 *
 * Property 4: Preservation — Consumed Items Still Blocked; Non-Zero Restores Unchanged;
 *             DELETE (archive) endpoint behavior unchanged.
 *
 * Validates: Requirements 2.4, 3.4, 3.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- Mock setup ---

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'

	const state: any = {
		pantryItem: null as any,
		updatedItem: null as any,
		body: {} as any,
		idParam: '1',
	}

	const prisma: any = {
		pantryItem: {
			findUnique: vi.fn(async () => {
				if (!state.pantryItem) return null
				return { ...state.pantryItem }
			}),
			update: vi.fn(async ({ data }: any) => {
				const updated = { ...state.pantryItem, ...data }
				state.updatedItem = updated
				return {
					...updated,
					updated_at: new Date(),
					product: {
						id: 1,
						brand_name: 'TestBrand',
						product_name: 'TestItem',
						image_thumb_base64: null,
					},
				}
			}),
		},
		activityLog: {
			create: vi.fn(async () => ({})),
		},
	}

	return { state, prisma }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))

vi.mock('../utils/requireAuth', () => ({
	requireAuth: vi.fn(() => ({ id: 42, email: 'user@test.com' })),
}))

vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return {
		...actual,
		readBody: vi.fn(async () => h.state.body),
		getRouterParam: vi.fn((_event: any, _key: string) => h.state.idParam),
	}
})

import putHandler from '../api/pantry_item/[id].put'
import deleteHandler from '../api/pantry_item/[id].delete'

const fakeEvent = () => ({ node: { req: { headers: {} }, res: {} } }) as any

/** Item archived because fully consumed (no expiry dates set, pieces=0) */
const makeConsumedArchivedItem = (overrides: any = {}) => ({
	id: 1,
	user_id: 42,
	pieces_count: 0,
	is_archived: true,
	deleted_at: null,
	expiration_date: null, // no expiry → consumed path
	best_before_date: null,
	net_content: null,
	net_unit: null,
	quantity: 0,
	portion_unit: 'pcs',
	category: 'Beverages',
	storage_location: 'Cupboard',
	product: { id: 1, product_name: 'Lemon Juice' },
	...overrides,
})

/** Item archived but still has pieces_count=1 (normal restore) */
const makeNormalArchivedItem = (overrides: any = {}) => ({
	id: 1,
	user_id: 42,
	pieces_count: 1,
	is_archived: true,
	deleted_at: null,
	expiration_date: null,
	best_before_date: null,
	net_content: null,
	net_unit: null,
	quantity: 1,
	portion_unit: 'pcs',
	category: 'Beverages',
	storage_location: 'Cupboard',
	product: { id: 1, product_name: 'Lemon Juice' },
	...overrides,
})

/** Active item (not archived) */
const makeActiveItem = (overrides: any = {}) => ({
	id: 1,
	user_id: 42,
	pieces_count: 2,
	is_archived: false,
	deleted_at: null,
	expiration_date: null,
	best_before_date: null,
	net_content: null,
	net_unit: null,
	quantity: 2,
	portion_unit: 'pcs',
	category: 'Beverages',
	storage_location: 'Cupboard',
	product: { id: 1, product_name: 'Lemon Juice' },
	...overrides,
})

beforeEach(() => {
	h.state.pantryItem = null
	h.state.updatedItem = null
	h.state.body = {}
	h.state.idParam = '1'
	vi.mocked(h.prisma.pantryItem.findUnique).mockClear()
	vi.mocked(h.prisma.pantryItem.update).mockClear()
	vi.mocked(h.prisma.activityLog.create).mockClear()
})

// ─────────────────────────────────────────────────────────────────────────────
// Preservation Case 1: Consumed item (pieces=0, no expiry) → still throws 409
// ─────────────────────────────────────────────────────────────────────────────

describe('Preservation 1 — consumed item (pieces_count=0, no expiry dates) still throws 409', () => {
	it('restore with pieces_count=0, expiration_date=null, best_before_date=null → 409', async () => {
		// OBSERVED on unfixed code: throws 409.
		// Must continue to throw 409 after the fix (this is the "consumed" path).
		h.state.pantryItem = makeConsumedArchivedItem()
		h.state.body = { is_archived: false }

		let threw = false
		let thrownStatus: number | undefined
		try {
			await (putHandler as any)(fakeEvent())
		} catch (err: any) {
			threw = true
			thrownStatus = err?.statusCode
		}

		expect(threw).toBe(true)
		expect(thrownStatus).toBe(409)
	})

	it('consumed item with future expiration_date and pieces_count=0 → still throws 409', async () => {
		// If expiration_date is in the FUTURE, the item was not archived because it expired.
		// This is a consumed item that also happens to have a future date — 409 must hold.
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
		h.state.pantryItem = makeConsumedArchivedItem({ expiration_date: tomorrow, pieces_count: 0 })
		h.state.body = { is_archived: false }

		let threw = false
		let thrownStatus: number | undefined
		try {
			await (putHandler as any)(fakeEvent())
		} catch (err: any) {
			threw = true
			thrownStatus = err?.statusCode
		}

		// On unfixed code this throws 409 (guard is unconditional).
		// On fixed code this ALSO throws 409 (future expiry = not an expired archival).
		expect(threw).toBe(true)
		expect(thrownStatus).toBe(409)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
// Preservation Case 2: pieces_count=1 archived item → restore succeeds
// ─────────────────────────────────────────────────────────────────────────────

describe('Preservation 2 — item with pieces_count=1 restores successfully', () => {
	it('restore with pieces_count=1, is_archived=true → succeeds', async () => {
		// OBSERVED on unfixed code: succeeds (pieces_count > 0 bypasses guard).
		// Must continue to succeed after the fix.
		h.state.pantryItem = makeNormalArchivedItem({ pieces_count: 1 })
		h.state.body = { is_archived: false }

		let threw = false
		let result: any
		try {
			result = await (putHandler as any)(fakeEvent())
		} catch (err: any) {
			threw = true
		}

		expect(threw).toBe(false)
		expect(result?.success).toBe(true)
		expect(result?.item?.is_archived).toBe(false)
	})

	it('restore with pieces_count=5, is_archived=true → succeeds', async () => {
		h.state.pantryItem = makeNormalArchivedItem({ pieces_count: 5 })
		h.state.body = { is_archived: false }

		let threw = false
		let result: any
		try {
			result = await (putHandler as any)(fakeEvent())
		} catch (err: any) {
			threw = true
		}

		expect(threw).toBe(false)
		expect(result?.success).toBe(true)
	})
})

// ─────────────────────────────────────────────────────────────────────────────
// Preservation Case 3: DELETE endpoint archives correctly
// ─────────────────────────────────────────────────────────────────────────────

describe('Preservation 3 — DELETE endpoint sets is_archived=true correctly', () => {
	it('DELETE on an active item sets is_archived=true and deleted_at to now', async () => {
		// OBSERVED on unfixed code: DELETE sets { is_archived: true, deleted_at: new Date() }.
		// Must continue unchanged after the fix (the fix is only in [id].put.ts).
		h.state.pantryItem = makeActiveItem()
		h.state.idParam = '1'

		const before = Date.now()
		let threw = false
		let result: any
		try {
			result = await (deleteHandler as any)(fakeEvent())
		} catch (err: any) {
			threw = true
		}

		expect(threw).toBe(false)
		expect(result?.success).toBe(true)

		// Confirm that prisma.update was called with is_archived: true and a deleted_at
		const updateCall = vi.mocked(h.prisma.pantryItem.update).mock.calls[0]
		expect(updateCall).toBeDefined()
		const updateData = updateCall[0]?.data
		expect(updateData?.is_archived).toBe(true)
		expect(updateData?.deleted_at).toBeInstanceOf(Date)
		expect((updateData?.deleted_at as Date).getTime()).toBeGreaterThanOrEqual(before)
	})

	it('DELETE returns { success: true }', async () => {
		h.state.pantryItem = makeActiveItem()

		const result = await (deleteHandler as any)(fakeEvent())
		expect(result).toEqual({ success: true })
	})
})
