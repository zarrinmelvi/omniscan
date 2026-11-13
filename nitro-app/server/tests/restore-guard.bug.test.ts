/**
 * Task 4 — Bug 2: Archive Restore Blocked at Zero Quantity
 *
 * BUG CONDITION EXPLORATION TEST — MUST FAIL on unfixed code.
 * Failure confirms the bug: an expired item with pieces_count=0 throws 409 on restore,
 * even though the item was archived due to expiry (not consumption).
 *
 * Property 3: Bug Condition — Expired Item with Zero Pieces Cannot Be Restored
 *
 * DO NOT fix the code when this test fails. Document the counterexample.
 *
 * Validates: Requirements 1.1 (Bug 2), 2.3
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// --- Mock setup (must use vi.hoisted so mocks run before imports) ---

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'

	const state: any = {
		pantryItem: null as any,
		updatedItem: null as any,
		body: {} as any,
		idParam: '1',
	}

	// Minimal prisma mock for the PUT handler
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

// Mock requireAuth to return a fake user
vi.mock('../utils/requireAuth', () => ({
	requireAuth: vi.fn(() => ({ id: 42, email: 'user@test.com' })),
}))

// Mock h3's readBody and getRouterParam
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return {
		...actual,
		readBody: vi.fn(async () => h.state.body),
		getRouterParam: vi.fn((_event: any, _key: string) => h.state.idParam),
	}
})

import putHandler from '../api/pantry_item/[id].put'

const fakeEvent = () => ({ node: { req: { headers: {} }, res: {} } }) as any

/** Returns a pantry item that was expired and had pieces_count=0 at archival time */
const makeExpiredArchivedItem = (overrides: any = {}) => {
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
	return {
		id: 1,
		user_id: 42,
		pieces_count: 0,
		is_archived: true,
		deleted_at: null,
		expiration_date: yesterday, // past its expiry → should be restorable
		best_before_date: null,
		net_content: null,
		net_unit: null,
		quantity: 0,
		portion_unit: 'pcs',
		category: 'Beverages',
		storage_location: 'Cupboard',
		product: { id: 1, product_name: 'Lemon Juice' },
		...overrides,
	}
}

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
// CONCRETE BUG CASE
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug 2 — Restore blocked for expired item with pieces_count=0 (MUST FAIL on unfixed code)', () => {
	it('should ALLOW restore of an item with pieces_count=0 when expiration_date is in the past', async () => {
		// SETUP: item was archived because it expired (expiration_date = yesterday).
		// pieces_count is 0 (set by make-recipe full-archive-fallback path).
		// This is an expiry archival — the item should be restorable.
		h.state.pantryItem = makeExpiredArchivedItem()
		h.state.body = { is_archived: false }

		// ASSERT: on the FIXED code this succeeds; on UNFIXED code the handler
		// throws 409 "Cannot restore this item because its quantity is 0."
		// => This test is EXPECTED TO FAIL on unfixed code, confirming the bug.
		let threw = false
		let thrownStatus: number | undefined
		let result: any

		try {
			result = await (putHandler as any)(fakeEvent())
		} catch (err: any) {
			threw = true
			thrownStatus = err?.statusCode
		}

		// If the handler threw 409, we have confirmed the bug. The test fails.
		// If the handler succeeds, the fix is in place. The test passes.
		expect(threw).toBe(false) // should NOT throw
		expect(result?.success).toBe(true) // should return success
		expect(result?.item?.is_archived).toBe(false)
	})

	it('best_before_date in the past (no expiration_date) should also allow restore', async () => {
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
		h.state.pantryItem = makeExpiredArchivedItem({
			expiration_date: null,
			best_before_date: yesterday, // best_before past → expired archival
		})
		h.state.body = { is_archived: false }

		let threw = false
		let result: any
		try {
			result = await (putHandler as any)(fakeEvent())
		} catch (err: any) {
			threw = true
		}

		// On unfixed code this throws 409 → test FAILS (confirming bug).
		expect(threw).toBe(false)
		expect(result?.success).toBe(true)
	})
})
