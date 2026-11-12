import { describe, it, expect } from 'vitest'
import { canRestorePantryItem } from './pantry-restore'

describe('canRestorePantryItem', () => {
	it('allows restore when quantity is greater than 0', () => {
		expect(canRestorePantryItem(1)).toEqual({ allowed: true })
		expect(canRestorePantryItem(5)).toEqual({ allowed: true })
		expect(canRestorePantryItem(0.5)).toEqual({ allowed: true })
	})

	it('blocks restore when quantity is exactly 0 (consumed)', () => {
		const result = canRestorePantryItem(0)
		expect(result.allowed).toBe(false)
		expect(result.reason).toContain('fully consumed')
	})

	it('blocks restore for negative quantities', () => {
		expect(canRestorePantryItem(-1).allowed).toBe(false)
		expect(canRestorePantryItem(-0.01).allowed).toBe(false)
	})

	it('blocks restore for non-finite quantities', () => {
		expect(canRestorePantryItem(NaN).allowed).toBe(false)
		expect(canRestorePantryItem(Infinity).allowed).toBe(false)
		expect(canRestorePantryItem(-Infinity).allowed).toBe(false)
	})
})
