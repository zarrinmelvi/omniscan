/**
 * Task 2: Preservation tests for recipe matching. Observed on UNFIXED code;
 * must PASS before and after the fix.
 *
 * Validates: Requirements 3.5
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
	matchIngredientsToPantry,
	findMatchingIngredientLine,
	type RawIngredient,
} from '../lib/recipe-matching'

const ing = (name: string): RawIngredient => ({ name, quantity: null, unit: null })
const pantry = (product_name: string, category: string | null, id = 1): any => ({ id, product_name, category })
const matches = (ingredient: string, productName: string, category: string | null) =>
	matchIngredientsToPantry([ing(ingredient)], [pantry(productName, category)]).matchedIngredientNames.length === 1

const PLAIN_CATEGORIES = ['Dairy', 'Grains', 'Uncategorized', null] as const
const PROCESSED = ['Beverages', 'Snacks', 'Instant Noodles', 'Canned Goods', 'Condiments & Sauces'] as const

// Reference copy of the ORIGINAL (pre-fix) per-item predicate, observed from the unfixed matcher.
const stem = (w: string) => w.trim().toLowerCase().replace(/(s|es|ies)$/i, '')
const MODS = [/\bin\s+oil\b/gi, /\bin\s+water\b/gi, /\bin\s+brine\b/gi, /\bin\s+sauce\b/gi, /\bin\s+sunflower\s+oil\b/gi, /\bin\s+olive\s+oil\b/gi, /\bwith\s+[\w\s]+\b/gi]
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function originalMatches(ingredient: string, productName: string): boolean {
	const rawTarget = ingredient.trim().toLowerCase()
	if (!rawTarget) return false
	const targetStem = rawTarget.split(/\s+/).map(stem).join(' ')
	let cleaned = productName.trim().toLowerCase()
	for (const m of MODS) cleaned = cleaned.replace(m, '')
	cleaned = cleaned.replace(/\s+/g, ' ').trim()
	const productStem = cleaned.split(/\s+/).map(stem).join(' ')
	if (cleaned === rawTarget || productStem === targetStem) return true
	return (
		new RegExp(`\\b${esc(rawTarget)}\\b`, 'i').test(cleaned) ||
		new RegExp(`\\b${esc(targetStem)}\\b`, 'i').test(productStem) ||
		new RegExp(`\\b${esc(productStem)}\\b`, 'i').test(targetStem)
	)
}

describe('raw / cooking ingredients (Dairy, Grains, Uncategorized, null) match as before', () => {
	it.each([
		['lemon', 'Fresh Lemon', 'Uncategorized', true],
		['lemon', 'Lemon', null, true],
		['rice', 'Basmati Rice', 'Grains', true],
		['eggs', 'Egg', 'Uncategorized', true],
		['egg', 'Eggs', null, true],
		['flour', 'All Purpose Flour', 'Grains', true],
		['milk', 'Full Cream Milk', 'Dairy', true],
		['onion', 'Red Onions', 'Uncategorized', true],
		['rice', 'Licorice', 'Uncategorized', false],
		['egg', 'Eggplant', 'Uncategorized', false],
		['lemon', 'Orange', 'Uncategorized', false],
		['butter', 'Peanut Butter', 'Uncategorized', true],
	])('ingredient "%s" vs "%s" (%s) => %s', (ingredient, product, category, expected) => {
		expect(matches(ingredient, product, category)).toBe(expected)
	})

	it('legacy null category is treated as plain (no name-based inference)', () => {
		expect(matches('lemon', 'Lemon Iced Tea', null)).toBe(true)
		expect(matches('steak', 'Ribeye Steak', null)).toBe(true)
	})

	it('findMatchingIngredientLine returns the same line as before for plain items', () => {
		const lines = [ing('flour'), ing('lemon'), ing('eggs')]
		expect(findMatchingIngredientLine('Fresh Lemon', lines)).toEqual(ing('lemon'))
		expect(findMatchingIngredientLine('Egg', lines)).toEqual(ing('eggs'))
		expect(findMatchingIngredientLine('Basmati Rice', lines)).toBeNull()
		expect(findMatchingIngredientLine('   ', lines)).toBeNull()
	})

	it('property: for plain categories the matcher equals the original predicate', () => {
		const words = ['lemon', 'rice', 'egg', 'eggs', 'flour', 'milk', 'basmati', 'fresh', 'red', 'onion', 'butter', 'tea', 'sauce', 'soy']
		const phrase = fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 3 }).map((w) => w.join(' '))
		fc.assert(
			fc.property(phrase, phrase, fc.constantFrom(...PLAIN_CATEGORIES), (ingredient, product, category) => {
				expect(matches(ingredient, product, category)).toBe(originalMatches(ingredient, product))
			}),
			{ numRuns: 200 },
		)
	})
})

describe('whole-product matches in processed categories still match', () => {
	it.each([
		['coffee', 'Coffee', 'Beverages'],
		['soy sauce', 'Soy Sauce', 'Condiments & Sauces'],
		['soy sauce', 'Kikkoman Soy Sauce', 'Condiments & Sauces'],
		['tuna', 'Century Tuna', 'Canned Goods'],
		['tuna', 'Tuna in Oil', 'Canned Goods'],
	])('ingredient "%s" is satisfied by "%s" (%s)', (ingredient, product, category) => {
		expect(matches(ingredient, product, category)).toBe(true)
	})

	it('property: a processed item whose whole name equals the ingredient always matches', () => {
		const words = ['coffee', 'cola', 'noodle', 'ketchup', 'vinegar', 'chips', 'sardine', 'cocoa']
		fc.assert(
			fc.property(fc.constantFrom(...words), fc.constantFrom(...PROCESSED), (name, category) => {
				expect(matches(name, name, category)).toBe(true)
			}),
		)
	})
})

describe('partition: matched + missing cover the input ingredients', () => {
	it('property: every non-empty ingredient is either matched or missing, never both', () => {
		const names = ['lemon', 'rice', 'egg', 'flour', 'coffee', 'tuna', 'soy sauce', 'milk', 'sugar', 'salt']
		const products = ['Fresh Lemon', 'Basmati Rice', 'Coffee', 'Century Tuna', 'Lemon Iced Tea', 'Soy Sauce', 'Full Cream Milk']
		const cats = [...PLAIN_CATEGORIES, ...PROCESSED]
		fc.assert(
			fc.property(
				fc.uniqueArray(fc.constantFrom(...names), { minLength: 1, maxLength: names.length }),
				fc.array(fc.tuple(fc.constantFrom(...products), fc.constantFrom(...cats)), { maxLength: 6 }),
				(ingredientNames, items) => {
					const ingredients = ingredientNames.map(ing)
					const pantryItems = items.map(([n, c], i) => pantry(n, c, i + 1))
					const r = matchIngredientsToPantry(ingredients, pantryItems)
					const covered = [...r.matchedIngredientNames, ...r.missingIngredientNames].sort()
					expect(covered).toEqual([...ingredientNames].sort())
					const matched = new Set(r.matchedIngredientNames)
					for (const m of r.missingIngredientNames) expect(matched.has(m)).toBe(false)
					expect(r.matchedIngredients.length + r.missingIngredients.length).toBe(ingredientNames.length)
				},
			),
			{ numRuns: 100 },
		)
	})
})
