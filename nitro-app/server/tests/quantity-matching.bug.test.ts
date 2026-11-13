/**
 * Task 7 / 9.6 — Bug 3: Quantity-Unaware Recipe Matching
 *
 * Originally written against UNFIXED code (binary matchIngredientsToPantry) as a
 * bug-condition exploration test. Updated deliberately in task 9.6 to assert the
 * FIXED behavior via matchIngredientsToPantryWithQuantity.
 *
 * Validates: Requirements 2.5, 2.6 (Bug 3)
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
	matchIngredientsToPantryWithQuantity,
	type PantryItemQuantityRef,
	type RawIngredient,
} from '../lib/recipe-matching'

const eggIngredient = (qty: number): RawIngredient => ({ name: 'egg', quantity: qty, unit: null })
const milkIngredient = (qty: number, unit: string): RawIngredient => ({ name: 'milk', quantity: qty, unit })

const eggPantryItem = (pieces: number): PantryItemQuantityRef => ({
	id: 1,
	product_name: 'Egg',
	category: 'Uncategorized',
	pieces_count: pieces,
	net_content: null,
	net_unit: null,
})

const milkPantryItem = (net_content: number, net_unit: string): PantryItemQuantityRef => ({
	id: 2,
	product_name: 'Fresh Milk',
	category: 'Dairy',
	pieces_count: 1,
	net_content,
	net_unit,
})

describe('Bug 3 (fixed) — egg shortfall detected', () => {
	it('recipe requires 3 eggs, pantry has 1 → shortfall with need 2, not matched', () => {
		const result = matchIngredientsToPantryWithQuantity([eggIngredient(3)], [eggPantryItem(1)])
		expect(result.matchedIngredients).toHaveLength(0)
		expect(result.missingIngredients).toHaveLength(0)
		expect(result.shortfallIngredients).toHaveLength(1)
		expect(result.shortfallIngredients[0]).toMatchObject({ name: 'egg', quantity: 3, have: 1, need: 2 })
	})

	it('recipe requires 3 eggs, pantry has 5 → matched, no shortfall', () => {
		const result = matchIngredientsToPantryWithQuantity([eggIngredient(3)], [eggPantryItem(5)])
		expect(result.matchedIngredients).toHaveLength(1)
		expect(result.shortfallIngredients).toHaveLength(0)
	})
})

describe('Bug 3 (fixed) — milk volume shortfall detected', () => {
	it('recipe requires 200 ml milk, pantry has 100 ml → shortfall need 100 ml', () => {
		const result = matchIngredientsToPantryWithQuantity([milkIngredient(200, 'ml')], [milkPantryItem(100, 'ml')])
		expect(result.matchedIngredients).toHaveLength(0)
		expect(result.shortfallIngredients).toHaveLength(1)
		expect(result.shortfallIngredients[0]).toMatchObject({ name: 'milk', have: 100, need: 100, unit: 'ml' })
	})

	it('recipe requires 2 tbsp milk (30 ml), pantry has 1000 ml → matched via unit conversion', () => {
		const result = matchIngredientsToPantryWithQuantity([milkIngredient(2, 'tbsp')], [milkPantryItem(1000, 'ml')])
		expect(result.matchedIngredients).toHaveLength(1)
		expect(result.shortfallIngredients).toHaveLength(0)
	})

	it('recipe requires 1 cup milk (240 ml), pantry has 120 ml → shortfall', () => {
		const result = matchIngredientsToPantryWithQuantity([milkIngredient(1, 'cup')], [milkPantryItem(120, 'ml')])
		expect(result.shortfallIngredients).toHaveLength(1)
		expect(result.shortfallIngredients[0].need).toBeCloseTo(0.5)
	})
})

describe('Bug 3 (fixed) — other cases', () => {
	it('null quantity → matched', () => {
		const result = matchIngredientsToPantryWithQuantity(
			[{ name: 'egg', quantity: null, unit: null }],
			[eggPantryItem(1)],
		)
		expect(result.matchedIngredients).toHaveLength(1)
		expect(result.shortfallIngredients).toHaveLength(0)
	})

	it('not in pantry → missing', () => {
		const result = matchIngredientsToPantryWithQuantity([{ name: 'butter', quantity: 1, unit: null }], [eggPantryItem(1)])
		expect(result.missingIngredients).toHaveLength(1)
		expect(result.shortfallIngredients).toHaveLength(0)
	})

	it('unit conversion failure → matched (safe fallback)', () => {
		// 'bunch' is not a convertible unit for an 'ml' pantry item
		const result = matchIngredientsToPantryWithQuantity([milkIngredient(5, 'bunch')], [milkPantryItem(1, 'ml')])
		expect(result.matchedIngredients).toHaveLength(1)
		expect(result.shortfallIngredients).toHaveLength(0)
	})

	it('weight requirement against a count item (no net_unit) → matched, not a bogus shortfall', () => {
		const flour: PantryItemQuantityRef = {
			id: 3,
			product_name: 'Flour',
			category: 'Grains',
			pieces_count: 1,
			net_content: null,
			net_unit: null,
		}
		const result = matchIngredientsToPantryWithQuantity([{ name: 'flour', quantity: 200, unit: 'g' }], [flour])
		expect(result.matchedIngredients).toHaveLength(1)
		expect(result.shortfallIngredients).toHaveLength(0)
	})

	it('matchIngredientsToPantryWithQuantity is exported as a function', async () => {
		const mod = await import('../lib/recipe-matching')
		expect(typeof mod.matchIngredientsToPantryWithQuantity).toBe('function')
	})
})

describe('Property 5 — shortfall computation (fast-check)', () => {
	it('available >= required → no shortfall; available < required → need = required - available', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 99 }), fc.integer({ min: 1, max: 99 }), (required, available) => {
				const result = matchIngredientsToPantryWithQuantity([eggIngredient(required)], [eggPantryItem(available)])
				if (available >= required) {
					expect(result.shortfallIngredients).toHaveLength(0)
					expect(result.matchedIngredients).toHaveLength(1)
				} else {
					expect(result.matchedIngredients).toHaveLength(0)
					expect(result.shortfallIngredients).toHaveLength(1)
					expect(result.shortfallIngredients[0].need).toBe(required - available)
				}
			}),
			{ numRuns: 200 },
		)
	})

	it('same holds for volume items in ml', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 5000 }), fc.integer({ min: 1, max: 5000 }), (required, available) => {
				const result = matchIngredientsToPantryWithQuantity(
					[milkIngredient(required, 'ml')],
					[milkPantryItem(available, 'ml')],
				)
				if (available >= required) {
					expect(result.shortfallIngredients).toHaveLength(0)
				} else {
					expect(result.shortfallIngredients).toHaveLength(1)
					expect(result.shortfallIngredients[0].need).toBe(required - available)
				}
			}),
			{ numRuns: 200 },
		)
	})
})
