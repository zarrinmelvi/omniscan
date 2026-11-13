/**
 * Task 1 — Bug 1: Fruit-Word Misdetection in Uncategorized Items
 *
 * BUG CONDITION EXPLORATION TEST — MUST FAIL on unfixed code.
 * Failure confirms the bug exists: itemMatchesIngredient returns true for
 * multi-word Uncategorized product names where the target is a fruit token.
 *
 * DO NOT fix the code when this test fails. Document the counterexamples.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { matchIngredientsToPantry, type RawIngredient } from '../lib/recipe-matching'

// Helper: test a single (productName, category, ingredient) triple
// Returns true if the ingredient is matched against the product.
const ing = (name: string): RawIngredient => ({ name, quantity: null, unit: null })
const doesMatch = (productName: string, category: string | null, ingredient: string): boolean =>
	matchIngredientsToPantry([ing(ingredient)], [{ id: 1, product_name: productName, category }]).matchedIngredientNames
		.length === 1

// --- Concrete failing cases ---
// These assert the EXPECTED (fixed) behavior: false.
// On unfixed code the function returns true, so these tests FAIL — confirming the bug.

describe('Bug 1 — Fruit misdetection in Uncategorized multi-word products', () => {
	it('should NOT match "lemon" against "Lemon Iced Tea" (Uncategorized)', () => {
		// itemMatchesIngredient("Lemon Iced Tea", "Uncategorized", "lemon", "lemon") → false
		expect(doesMatch('Lemon Iced Tea', 'Uncategorized', 'lemon')).toBe(false)
	})

	it('should NOT match "strawberry" against "Strawberry Nectar Juice" (null category)', () => {
		// itemMatchesIngredient("Strawberry Nectar Juice", null, "strawberry", "strawberri") → false
		expect(doesMatch('Strawberry Nectar Juice', null, 'strawberry')).toBe(false)
	})

	it('should NOT match "orange" against "Orange Soda" (Uncategorized)', () => {
		// itemMatchesIngredient("Orange Soda", "Uncategorized", "orange", "orang") → false
		expect(doesMatch('Orange Soda', 'Uncategorized', 'orange')).toBe(false)
	})
})

// --- Fast-check property ---
// Property: for any multi-word product name where the first word is the target
// and the category is Uncategorized or null, the result should be false.
// (The first word of a compound product name is a flavor marker, not the
// actual ingredient. Only a single-word exact match like "Lemon" should match.)

describe('Property 1 — multi-word Uncategorized/null products should not match a single fruit token', () => {
	const fruitWords = ['lemon', 'strawberry', 'orange', 'mango', 'banana', 'pineapple', 'grape', 'peach', 'cherry', 'coconut']
	// All suffixes here contain at least one PRODUCT_TYPE_WORDS token (tea, juice, soda, drink, mix, cola, noodle),
	// so the compound product will be blocked by the Bug 1 fix.
	const suffixes = ['Iced Tea', 'Nectar Juice', 'Soda', 'Flavored Drink', 'Drink Mix', 'Energy Drink', 'Cola Float', 'Noodle Soup']
	const uncategorizedValues = [null, 'Uncategorized'] as const

	it('property: multi-word Uncategorized/null product with first-word fruit target returns false', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...fruitWords),
				fc.constantFrom(...suffixes),
				fc.constantFrom(...uncategorizedValues),
				(fruit, suffix, category) => {
					const productName = `${fruit.charAt(0).toUpperCase() + fruit.slice(1)} ${suffix}`
					// productName is multi-word (e.g. "Lemon Iced Tea"), category is Uncategorized/null,
					// target matches the first word exactly — this SHOULD return false (the fix).
					expect(doesMatch(productName, category, fruit)).toBe(false)
				},
			),
			{ numRuns: 200 },
		)
	})
})
