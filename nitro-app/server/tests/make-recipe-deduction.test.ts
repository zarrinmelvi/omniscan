/**
 * Task 9.3 — make.post.ts deduction uses net_content/net_unit and a pre-flight
 * shortfall check that runs before any DB writes.
 *
 * Validates: Requirements 2.8, 3.7 (Bug 3)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	const state: any = { recipeIngredients: [] as any[], pantry: [] as any[], body: { recipe_id: 1 } }
	const prisma: any = {
		recipe: {
			findUnique: vi.fn(async () => ({
				id: 1,
				name: 'Test Recipe',
				instructions: 'Cook.',
				raw_ingredients: state.recipeIngredients,
				portions_guide: null,
			})),
		},
		pantryItem: {
			findMany: vi.fn(async () => state.pantry),
			update: vi.fn(async () => ({})),
		},
		user: { findUnique: vi.fn(async () => ({ allergens: [], dietary_prof: [] })) },
		recipeInteraction: { upsert: vi.fn(async () => ({ liked: false })) },
	}
	return { state, prisma }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))
vi.mock('../utils/requireAuth', () => ({ requireAuth: vi.fn(() => ({ id: 42, email: 'u@test.com' })) }))
vi.mock('../lib/allergen-matching', () => ({
	findMatchedUserAllergens: vi.fn(() => []),
	matchUserAllergensSemantically: vi.fn(async () => []),
	mergeMatchedAllergens: vi.fn(() => []),
}))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import makeHandler from '../api/recipes/make.post'

const fakeEvent = () => ({ node: { req: { headers: {} }, res: {} } }) as any

const pantryRow = (overrides: any = {}) => ({
	id: 10,
	category: 'Dairy',
	quantity: 1,
	portion_unit: 'pcs',
	pieces_count: 1,
	net_content: 1000,
	net_unit: 'ml',
	product: { product_name: 'Fresh Milk' },
	...overrides,
})

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubGlobal('$fetch', vi.fn(async () => {
		throw new Error('no AI in tests')
	}))
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('make.post deduction', () => {
	it('1000 ml milk, recipe uses 10 ml → net_content becomes 990, not archived', async () => {
		h.state.recipeIngredients = [{ name: 'milk', quantity: 10, unit: 'ml' }]
		h.state.pantry = [pantryRow()]
		const res: any = await makeHandler(fakeEvent())
		expect(res.success).toBe(true)
		expect(h.prisma.pantryItem.update).toHaveBeenCalledTimes(1)
		const arg = h.prisma.pantryItem.update.mock.calls[0][0]
		expect(arg.data.net_content).toBe(990)
		expect(arg.data.is_archived).toBeUndefined()
	})

	it('100 ml milk, recipe uses 100 ml → archived with net_content 0', async () => {
		h.state.recipeIngredients = [{ name: 'milk', quantity: 100, unit: 'ml' }]
		h.state.pantry = [pantryRow({ net_content: 100 })]
		await makeHandler(fakeEvent())
		const arg = h.prisma.pantryItem.update.mock.calls[0][0]
		expect(arg.data).toMatchObject({ is_archived: true, net_content: 0 })
	})

	it('count item: 3 eggs, recipe uses 1 → quantity 2', async () => {
		h.state.recipeIngredients = [{ name: 'egg', quantity: 1, unit: null }]
		h.state.pantry = [
			pantryRow({ id: 11, product: { product_name: 'Egg' }, category: 'Uncategorized', quantity: 3, pieces_count: 3, net_content: null, net_unit: null }),
		]
		await makeHandler(fakeEvent())
		const arg = h.prisma.pantryItem.update.mock.calls[0][0]
		expect(arg.data.quantity).toBe(2)
		expect(arg.data.is_archived).toBeUndefined()
	})

	it('shortfall → 409 and no DB writes', async () => {
		h.state.recipeIngredients = [{ name: 'milk', quantity: 200, unit: 'ml' }]
		h.state.pantry = [pantryRow({ net_content: 100 })]
		await expect(makeHandler(fakeEvent())).rejects.toMatchObject({ statusCode: 409 })
		expect(h.prisma.pantryItem.update).not.toHaveBeenCalled()
		expect(h.prisma.recipeInteraction.upsert).not.toHaveBeenCalled()
	})

	it('unit conversion failure keeps full-archive fallback', async () => {
		h.state.recipeIngredients = [{ name: 'milk', quantity: 1, unit: 'bunch' }]
		h.state.pantry = [pantryRow()]
		await makeHandler(fakeEvent())
		const arg = h.prisma.pantryItem.update.mock.calls[0][0]
		expect(arg.data).toMatchObject({ is_archived: true, quantity: 0 })
	})
})
