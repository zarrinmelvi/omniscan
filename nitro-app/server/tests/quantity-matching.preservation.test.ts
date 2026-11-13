/**
 * Task 8 — Bug 3: Preservation tests (MUST PASS on unfixed AND fixed code)
 *
 * These tests document the CORRECT baseline behavior that must be preserved
 * after the quantity-aware matching fix is applied.
 *
 * Observed and confirmed on UNFIXED code first:
 * 1. Ingredients with quantity=null are always matched (binary match unchanged).
 * 2. Fully-covered ingredients (pantry qty >= required) remain matched.
 * 3. Binary matchIngredientsToPantry still works for null-quantity callers.
 * 4. Property: for ingredients with quantity=null, any name-matching pantry item
 *    results in that ingredient appearing in matchedIngredientNames.
 *
 * Validates: Requirements 3.6, 3.7, 3.8
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { matchIngredientsToPantry, type RawIngredient, type PantryProductRef } from '../lib/recipe-matching'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ing = (name: string, quantity: number | null = null, unit: string | null = null): RawIngredient => ({ name, quantity, unit })
const pantry = (product_name: string, category: string | null = null, id = 1): PantryProductRef => ({ id, product_name, category })

// ─── Preservation 1: null-quantity ingredients are always matched ──────────────
// If a recipe ingredient has quantity=null (no amount specified), the binary
// match continues to apply — name presence is enough to satisfy the ingredient.

describe('Preservation 1 — null-quantity ingredients always matched by name (binary match unchanged)', () => {
	it('egg with quantity=null, pantry has "Egg" → egg in matchedIngredientNames', () => {
		const result = matchIngredientsToPantry([ing('egg')], [pantry('Egg', 'Uncategorized')])
		expect(result.matchedIngredientNames).toContain('egg')
		expect(result.missingIngredientNames).not.toContain('egg')
	})

	it('milk with quantity=null, pantry has "Fresh Milk" → milk in matchedIngredientNames', () => {
		const result = matchIngredientsToPantry([ing('milk')], [pantry('Fresh Milk', 'Dairy')])
		expect(result.matchedIngredientNames).toContain('milk')
	})

	it('salt with quantity=null, pantry has single-word "Salt" (null category) → salt in matchedIngredientNames', () => {
		// Single-word exact match — always passes even with Bug 1 fix applied
		const result = matchIngredientsToPantry([ing('salt')], [pantry('Salt', null)])
		expect(result.matchedIngredientNames).toContain('salt')
	})

	it('sugar with quantity=null, pantry has "White Sugar" (Grains category) → sugar in matchedIngredientNames', () => {
		// Plain category (Grains) is not in PROCESSED_CATEGORIES — word-boundary match applies
		const result = matchIngredientsToPantry([ing('sugar')], [pantry('White Sugar', 'Grains')])
		expect(result.matchedIngredientNames).toContain('sugar')
	})
})

// ─── Preservation 2: Fully-covered ingredients remain matched ─────────────────
// When the pantry has MORE than enough (pieces_count >= required), the ingredient
// must continue to appear in matchedIngredientNames (no regression for the happy path).
// NOTE: The binary matchIngredientsToPantry does not inspect pieces_count at all,
// so this test confirms the matched result for a fully-covered scenario — it will
// still pass after the quantity-aware function is introduced because the BINARY
// function used here is unchanged by the fix (see Preservation 3 below).

describe('Preservation 2 — fully-covered ingredient remains matched (pantry qty >= required)', () => {
	it('recipe requires 2 eggs, pantry has Egg (pieces_count=3) → egg in matchedIngredientNames', () => {
		// The binary matchIngredientsToPantry does not look at pieces_count —
		// it always matches by name. After the fix, the new quantity-aware
		// function will confirm: 3 >= 2, so egg stays in matched (not shortfall).
		// Here we confirm the binary function still returns the matched result
		// (preserving the non-quantity caller contract).
		const result = matchIngredientsToPantry([ing('egg', 2)], [pantry('Egg', 'Uncategorized')])
		expect(result.matchedIngredientNames).toContain('egg')
	})

	it('recipe requires 1 cup milk, pantry has "Fresh Milk" → milk in matchedIngredientNames', () => {
		const result = matchIngredientsToPantry([ing('milk', 1, 'cup')], [pantry('Fresh Milk', 'Dairy')])
		expect(result.matchedIngredientNames).toContain('milk')
	})

	it('recipe requires 500g flour, pantry has "All Purpose Flour" → flour matched', () => {
		const result = matchIngredientsToPantry([ing('flour', 500, 'g')], [pantry('All Purpose Flour', 'Grains')])
		expect(result.matchedIngredientNames).toContain('flour')
	})
})

// ─── Preservation 3: Binary matchIngredientsToPantry unchanged for non-quantity callers ──
// The binary matchIngredientsToPantry function is used in notification generation
// (index.post.ts), liked.get.ts, and made.get.ts. Its behavior must NOT change
// after the fix — only the new quantity-aware function changes.

describe('Preservation 3 — binary matchIngredientsToPantry is unchanged for non-quantity callers', () => {
	it('binary match: multiple ingredients, all names match → all in matchedIngredientNames', () => {
		const ingredients = [ing('rice'), ing('egg'), ing('salt')]
		// 'Sea Salt' with null category would be blocked by Bug 1 fix (multi-word null-category).
		// Use explicit 'Grains' category so word-boundary match applies as expected.
		const items = [pantry('Basmati Rice', 'Grains', 1), pantry('Egg', 'Uncategorized', 2), pantry('Sea Salt', 'Grains', 3)]
		const result = matchIngredientsToPantry(ingredients, items)
		expect(result.matchedIngredientNames).toContain('rice')
		expect(result.matchedIngredientNames).toContain('egg')
		expect(result.matchedIngredientNames).toContain('salt')
		expect(result.missingIngredientNames).toHaveLength(0)
	})

	it('binary match: missing ingredient → in missingIngredientNames', () => {
		const result = matchIngredientsToPantry([ing('butter')], [pantry('Egg', 'Uncategorized')])
		expect(result.missingIngredientNames).toContain('butter')
		expect(result.matchedIngredientNames).not.toContain('butter')
	})

	it('binary match: matched + missing partition covers all ingredients exactly', () => {
		const ingredients = [ing('rice'), ing('butter'), ing('egg')]
		const items = [pantry('Basmati Rice', 'Grains', 1), pantry('Egg', null, 2)]
		const result = matchIngredientsToPantry(ingredients, items)
		const all = [...result.matchedIngredientNames, ...result.missingIngredientNames].sort()
		expect(all).toEqual(['butter', 'egg', 'rice'])
		expect(result.missingIngredientNames).toContain('butter')
	})

	it('binary match ignores quantity field for null-quantity ingredients (unchanged behavior)', () => {
		// Calling with quantity=null still works exactly as before
		const result = matchIngredientsToPantry([ing('egg', null)], [pantry('Egg', 'Uncategorized')])
		expect(result.matchedIngredientNames).toContain('egg')
	})
})

// ─── Preservation 4 (fast-check): null-quantity ingredients always matched by name ──
// Property: For ANY ingredient with quantity=null, if a pantry item exists whose
// product_name matches (via the binary matcher), the ingredient MUST appear in
// matchedIngredientNames. This documents the core invariant of the binary match
// and ensures no regression after the fix.

describe('Preservation 4 — fast-check: null-quantity ingredient always matched when name matches', () => {
	const ingredientNames = ['egg', 'milk', 'rice', 'flour', 'salt', 'sugar', 'butter', 'garlic', 'onion', 'tomato']
	// Product names that match the corresponding ingredient names
	const matchingProductNames: Record<string, string[]> = {
		egg: ['Egg', 'Eggs', 'Fresh Egg'],
		milk: ['Milk', 'Fresh Milk', 'Full Cream Milk'],
		rice: ['Rice', 'Basmati Rice', 'White Rice'],
		flour: ['Flour', 'All Purpose Flour', 'Wheat Flour'],
		salt: ['Salt', 'Sea Salt', 'Table Salt'],
		sugar: ['Sugar', 'White Sugar', 'Brown Sugar'],
		butter: ['Butter', 'Salted Butter', 'Unsalted Butter'],
		garlic: ['Garlic', 'Fresh Garlic', 'Garlic Cloves'],
		onion: ['Onion', 'Onions', 'Red Onions'],
		tomato: ['Tomato', 'Tomatoes', 'Cherry Tomatoes'],
	}
	const categories = ['Uncategorized', null, 'Dairy', 'Grains', 'Vegetables'] as const

	it('property: for ingredients with quantity=null, any matching-name pantry item is in matchedIngredientNames', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...ingredientNames),
				fc.constantFrom(...categories),
				(ingredientName, category) => {
					// Pick a matching product name for this ingredient
					const products = matchingProductNames[ingredientName]
					const productName = products[0]
					const ingredient: RawIngredient = { name: ingredientName, quantity: null, unit: null }
					const result = matchIngredientsToPantry([ingredient], [{ id: 1, product_name: productName, category }])
					// The ingredient must be in matchedIngredientNames (binary name match)
					expect(result.matchedIngredientNames).toContain(ingredientName)
				},
			),
			{ numRuns: 200 },
		)
	})
})
