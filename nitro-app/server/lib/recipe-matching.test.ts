import { describe, it, expect } from 'vitest'
import {
	PROCESSED_CATEGORIES,
	isProcessedCategory,
	isRecipeMatchableName,
	keywordSourceNames,
	matchIngredientsToPantry,
	matchIngredientsToPantryForDeduction,
	findMatchingIngredientLine,
} from './recipe-matching'

const ing = (name: string) => ({ name, quantity: null, unit: null })
const matched = (ingredient: string, product_name: string, category?: string | null) =>
	matchIngredientsToPantry([ing(ingredient)], [{ id: 1, product_name, category }]).matchedIngredientNames.length === 1

describe('isProcessedCategory', () => {
	it('recognises processed categories only', () => {
		for (const c of PROCESSED_CATEGORIES) expect(isProcessedCategory(c)).toBe(true)
		for (const c of ['Dairy', 'Grains', 'Uncategorized', null, undefined]) expect(isProcessedCategory(c)).toBe(false)
	})
})

describe('category gating', () => {
	it('plain and null categories keep partial-name matching', () => {
		expect(matched('lemon', 'Lemon Iced Tea', null)).toBe(true)
		expect(matched('lemon', 'Fresh Lemon', 'Uncategorized')).toBe(true)
		expect(matched('milk', 'Full Cream Milk', 'Dairy')).toBe(true)
	})

	it('Beverages, Snacks and Instant Noodles match whole product only', () => {
		expect(matched('lemon', 'Lemon Iced Tea', 'Beverages')).toBe(false)
		expect(matched('lemon', 'Sprite Lemon', 'Beverages')).toBe(false)
		expect(matched('lemon', 'Lemon Flavored Chips', 'Snacks')).toBe(false)
		expect(matched('chicken', 'Chicken Flavor Noodles', 'Instant Noodles')).toBe(false)
		expect(matched('coffee', 'Coffee', 'Beverages')).toBe(true)
		expect(matched('coffee', 'Sprite Coffee', 'Beverages')).toBe(false)
	})

	it('also works through the deduction matcher', () => {
		const r = matchIngredientsToPantryForDeduction(
			[ing('lemon')],
			[{ id: 1, product_name: 'Lemon Iced Tea', category: 'Beverages', quantity: 1, portion_unit: 'pcs' }],
		)
		expect(r.deductions).toEqual([])
		expect(r.missingIngredientNames).toEqual(['lemon'])
	})
})

describe('head-phrase rule (Condiments & Sauces, Canned Goods)', () => {
	it('accepts the trailing product phrase', () => {
		expect(matched('soy sauce', 'Kikkoman Soy Sauce', 'Condiments & Sauces')).toBe(true)
		expect(matched('tuna', 'Century Tuna', 'Canned Goods')).toBe(true)
		expect(matched('tuna', 'Tuna in Oil', 'Canned Goods')).toBe(true)
	})

	it('rejects flavor/variant words', () => {
		expect(matched('lemon', 'Lemon Sauce', 'Condiments & Sauces')).toBe(false)
		expect(matched('lemon', 'Acme Sauce Lemon', 'Condiments & Sauces')).toBe(false)
		expect(matched('chili', 'Chili Flavoured Tuna', 'Canned Goods')).toBe(false)
	})

	it('rejects a head phrase when a flavor marker is present', () => {
		expect(matched('tuna', 'Century Tuna Lemon Flavored', 'Canned Goods')).toBe(false)
		expect(matched('tuna', 'Century FLAVOUR Tuna', 'Canned Goods')).toBe(false)
		expect(matched('sauce', 'Lemon Scented Sauce', 'Condiments & Sauces')).toBe(false)
	})

	it('is not applied to Beverages', () => {
		expect(matched('tea', 'Lipton Tea', 'Beverages')).toBe(false)
	})
})

describe('plural / stem handling', () => {
	it('stems whole-name matches in processed categories', () => {
		expect(matched('chips', 'Chip', 'Snacks')).toBe(true)
		expect(matched('chip', 'Chips', 'Snacks')).toBe(true)
	})

	it('stems head phrases', () => {
		expect(matched('tunas', 'Century Tuna', 'Canned Goods')).toBe(true)
		expect(matched('tuna', 'Century Tunas', 'Canned Goods')).toBe(true)
	})
})

describe('findMatchingIngredientLine', () => {
	const lines = [ing('lemon'), ing('soy sauce'), ing('tuna')]

	it('behaves as before without a category', () => {
		expect(findMatchingIngredientLine('Lemon Iced Tea', lines)).toEqual(ing('lemon'))
	})

	it('behaves as before for plain categories and null', () => {
		expect(findMatchingIngredientLine('Fresh Lemon', lines, 'Uncategorized')).toEqual(ing('lemon'))
		expect(findMatchingIngredientLine('Lemon Iced Tea', lines, null)).toEqual(ing('lemon'))
	})

	it('gates processed categories', () => {
		expect(findMatchingIngredientLine('Lemon Iced Tea', lines, 'Beverages')).toBeNull()
		expect(findMatchingIngredientLine('Lemon Sauce', lines, 'Condiments & Sauces')).toBeNull()
		expect(findMatchingIngredientLine('Kikkoman Soy Sauce', lines, 'Condiments & Sauces')).toEqual(ing('soy sauce'))
		expect(findMatchingIngredientLine('Century Tuna', lines, 'Canned Goods')).toEqual(ing('tuna'))
		expect(findMatchingIngredientLine('Soy Sauce', lines, 'Beverages')).toEqual(ing('soy sauce'))
	})
})

describe('keywordSourceNames / isRecipeMatchableName', () => {
	it('keeps plain names, drops flavor-only long names of whole-match categories', () => {
		const names = keywordSourceNames([
			{ product_name: 'Fresh Lemon', category: 'Uncategorized' },
			{ product_name: 'Legacy Item', category: null },
			{ product_name: 'Lemon Iced Tea Zero Sugar', category: 'Beverages' },
			{ product_name: 'Coffee', category: 'Beverages' },
			{ product_name: 'Kikkoman Soy Sauce', category: 'Condiments & Sauces' },
			{ product_name: 'Tuna in Oil', category: 'Canned Goods' },
		])
		expect(names).toEqual(['Fresh Lemon', 'Legacy Item', 'coffee', 'kikkoman soy sauce', 'tuna'])
	})

	it('flags empty names as not matchable', () => {
		expect(isRecipeMatchableName('Rice')).toBe(true)
		expect(isRecipeMatchableName('   ')).toBe(false)
	})
})
