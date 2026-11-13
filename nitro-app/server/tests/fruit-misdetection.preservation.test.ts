/**
 * Task 2 — Bug 1: Preservation tests (MUST PASS on unfixed AND fixed code)
 *
 * These tests document the CORRECT baseline behavior that must be preserved
 * after the fix is applied. They are observed and confirmed on unfixed code first.
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { matchIngredientsToPantry, PROCESSED_CATEGORIES, type RawIngredient } from '../lib/recipe-matching'

// Helper: test a single (productName, category, ingredient) triple
const ing = (name: string): RawIngredient => ({ name, quantity: null, unit: null })
const doesMatch = (productName: string, category: string | null, ingredient: string): boolean =>
	matchIngredientsToPantry([ing(ingredient)], [{ id: 1, product_name: productName, category }]).matchedIngredientNames
		.length === 1

// --- Concrete preservation cases ---
// These are OBSERVED on unfixed code and must remain true after the fix.

describe('Preservation — exact single-word matches must continue to work', () => {
	it('single-word "Banana" (Uncategorized) matches ingredient "banana"', () => {
		// itemMatchesIngredient("Banana", "Uncategorized", "banana", "banana") → true (exact match)
		// A raw ingredient named exactly "banana" is correct — not a processed product.
		expect(doesMatch('Banana', 'Uncategorized', 'banana')).toBe(true)
	})

	it('single-word "Lemon" (null category) matches ingredient "lemon"', () => {
		// A manually-added raw lemon in pantry — exact match, must remain true
		expect(doesMatch('Lemon', null, 'lemon')).toBe(true)
	})

	it('single-word "Egg" (Uncategorized) matches ingredient "eggs" (stem match)', () => {
		expect(doesMatch('Egg', 'Uncategorized', 'eggs')).toBe(true)
	})

	it('single-word "Eggs" (null) matches ingredient "egg" (reverse stem match)', () => {
		expect(doesMatch('Eggs', null, 'egg')).toBe(true)
	})
})

describe('Preservation — Beverages guard already blocks partial matches (must stay false)', () => {
	it('"Lemon Iced Tea" (Beverages) does NOT match ingredient "lemon"', () => {
		// itemMatchesIngredient("Lemon Iced Tea", "Beverages", "lemon", "lemon") → false
		// The Beverages processed-category guard already works; must remain false after fix.
		expect(doesMatch('Lemon Iced Tea', 'Beverages', 'lemon')).toBe(false)
	})

	it('"Strawberry Milk Drink" (Beverages) does NOT match ingredient "strawberry"', () => {
		expect(doesMatch('Strawberry Milk Drink', 'Beverages', 'strawberry')).toBe(false)
	})

	it('"Orange Soda" (Beverages) does NOT match ingredient "orange"', () => {
		expect(doesMatch('Orange Soda', 'Beverages', 'orange')).toBe(false)
	})
})

// --- Fast-check Property 2a ---
// For all single-word product names where cleanedName === target (exact match),
// the result must equal the unfixed result (true).
// Observed on unfixed code: exact single-word matches return true.
// This must continue to hold after the fix.

describe('Property 2a — single-word exact match must always return true', () => {
	const singleWordFruits = ['lemon', 'banana', 'orange', 'mango', 'strawberry', 'grape', 'peach', 'coconut', 'egg', 'rice', 'milk', 'salt', 'sugar', 'flour', 'butter', 'garlic', 'onion', 'tomato']
	const uncategorizedValues = [null, 'Uncategorized'] as const

	it('property: single-word product where name === ingredient always matches', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...singleWordFruits),
				fc.constantFrom(...uncategorizedValues),
				(word, category) => {
					// Product name is exactly the ingredient word (capitalized), category is null/Uncategorized.
					// This is a raw ingredient entry, not a processed product — must match.
					const productName = word.charAt(0).toUpperCase() + word.slice(1)
					expect(doesMatch(productName, category, word)).toBe(true)
				},
			),
			{ numRuns: 200 },
		)
	})
})

// --- Fast-check Property 2b ---
// For all items in PROCESSED_CATEGORIES, fixed and unfixed agree.
// On unfixed code, PROCESSED_CATEGORIES items already correctly block partial matches
// (except through HEAD_PHRASE_CATEGORIES). This stub confirms the processed-category
// guard is not broken — passes for now and must continue to pass after the fix.

describe('Property 2b — PROCESSED_CATEGORIES guard unchanged (stub)', () => {
	const fruitWords = ['lemon', 'strawberry', 'orange', 'mango', 'banana', 'pineapple', 'grape', 'peach']
	const suffixes = ['Iced Tea', 'Nectar Juice', 'Soda', 'Flavored Drink', 'Fruit Punch']
	const processedCats = PROCESSED_CATEGORIES.filter((c) => c !== 'Canned Goods' && c !== 'Condiments & Sauces')

	it('property: multi-word product in Beverages/Snacks/Instant Noodles always rejects partial fruit match', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...fruitWords),
				fc.constantFrom(...suffixes),
				fc.constantFrom(...processedCats),
				(fruit, suffix, category) => {
					const productName = `${fruit.charAt(0).toUpperCase() + fruit.slice(1)} ${suffix}`
					// PROCESSED_CATEGORIES (non-HEAD_PHRASE) already block this — must stay false
					expect(doesMatch(productName, category, fruit)).toBe(false)
				},
			),
			{ numRuns: 200 },
		)
	})

	it('single-word product in a processed category still matches when exact', () => {
		// e.g. "Coffee" (Beverages) matches "coffee" — exact whole-name match
		expect(doesMatch('Coffee', 'Beverages', 'coffee')).toBe(true)
		expect(doesMatch('Cola', 'Beverages', 'cola')).toBe(true)
	})
})
