import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import jwt from 'jsonwebtoken'
import { createVerificationToken, readPendingUsername } from '../lib/verification-token'

const ORIGINAL = process.env.JWT_SECRET

beforeEach(() => {
	process.env.JWT_SECRET = 'test-secret'
})
afterEach(() => {
	if (ORIGINAL === undefined) delete process.env.JWT_SECRET
	else process.env.JWT_SECRET = ORIGINAL
})

describe('verification-token', () => {
	it('round-trips a pending username', () => {
		expect(readPendingUsername(createVerificationToken('zarrin_1'))).toBe('zarrin_1')
	})

	it('returns null for a tampered token', () => {
		const t = createVerificationToken('zarrin_1')
		expect(readPendingUsername(t.slice(0, -2) + 'xx')).toBeNull()
	})

	it('returns null for a token signed with another secret or another purpose', () => {
		expect(readPendingUsername(jwt.sign({ t: 'verify', u: 'abcd' }, 'other'))).toBeNull()
		expect(readPendingUsername(jwt.sign({ t: 'other', u: 'abcd' }, 'test-secret'))).toBeNull()
	})

	it('falls back to a plain random token without username or secret', () => {
		const noName = createVerificationToken()
		expect(readPendingUsername(noName)).toBeNull()
		delete process.env.JWT_SECRET
		const noSecret = createVerificationToken('zarrin_1')
		expect(noSecret.split('.').length).toBe(1)
		expect(readPendingUsername(noSecret)).toBeNull()
	})

	it('returns null for empty input and generates unique tokens', () => {
		expect(readPendingUsername(null)).toBeNull()
		expect(readPendingUsername('')).toBeNull()
		expect(createVerificationToken('zarrin_1')).not.toBe(createVerificationToken('zarrin_1'))
	})

	it('property: round trip for valid usernames', () => {
		// **Validates: Requirements 2.1, 2.2**
		fc.assert(
			fc.property(fc.stringMatching(/^[a-zA-Z0-9_]{4,15}$/), (u) => {
				expect(readPendingUsername(createVerificationToken(u))).toBe(u)
			}),
			{ numRuns: 50 },
		)
	})
})
