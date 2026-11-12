import { describe, it, expect } from 'vitest'
import { validatePassword, PASSWORD_MIN, PASSWORD_MAX } from './password-policy'

describe('validatePassword', () => {
	const valid = 'Aa1!somepw' // 10 chars, meets every class

	it('accepts a password at the minimum length (10) with all character classes', () => {
		expect('Aa1!somepw'.length).toBe(PASSWORD_MIN)
		expect(validatePassword('Aa1!somepw')).toBeNull()
	})

	it('accepts a password at the maximum length (30) with all character classes', () => {
		const max = 'Aa1!' + 'x'.repeat(30 - 4) // exactly 30 chars
		expect(max.length).toBe(PASSWORD_MAX)
		expect(validatePassword(max)).toBeNull()
	})

	it('rejects a password shorter than the minimum', () => {
		expect(validatePassword('Aa1!short')).not.toBeNull() // 9 chars
	})

	it('rejects a password longer than the maximum', () => {
		const tooLong = 'Aa1!' + 'x'.repeat(PASSWORD_MAX - 4 + 1) // 31 chars
		expect(tooLong.length).toBe(PASSWORD_MAX + 1)
		expect(validatePassword(tooLong)).not.toBeNull()
		expect(validatePassword(tooLong)).toContain(`${PASSWORD_MIN}`)
		expect(validatePassword(tooLong)).toContain(`${PASSWORD_MAX}`)
	})

	it('rejects a password missing an uppercase letter', () => {
		expect(validatePassword('aa1!somepw')).not.toBeNull()
	})

	it('rejects a password missing a lowercase letter', () => {
		expect(validatePassword('AA1!SOMEPW')).not.toBeNull()
	})

	it('rejects a password missing a number', () => {
		expect(validatePassword('Aa!somepw')).not.toBeNull()
	})

	it('rejects a password missing a special character', () => {
		expect(validatePassword('Aa1somepw')).not.toBeNull()
	})

	it('rejects non-string and empty inputs', () => {
		expect(validatePassword(null)).not.toBeNull()
		expect(validatePassword(undefined)).not.toBeNull()
		expect(validatePassword(123456)).not.toBeNull()
		expect(validatePassword('')).not.toBeNull()
		expect(validatePassword('   ')).not.toBeNull()
	})

	it('reports a length-specific message for an out-of-range password', () => {
		expect(validatePassword('a')).toContain(`${PASSWORD_MIN}`)
	})
})
