import { describe, it, expect } from 'vitest'
import {
	RESET_COOLDOWN_SECONDS,
	isWellFormedEmail,
	passwordFingerprint,
	resetCooldownRemaining,
} from './password-reset'

describe('passwordFingerprint', () => {
	it('is stable for the same hash and changes when the hash changes', () => {
		expect(passwordFingerprint('hash-a')).toBe(passwordFingerprint('hash-a'))
		expect(passwordFingerprint('hash-a')).not.toBe(passwordFingerprint('hash-b'))
	})

	it('treats a missing password (Google-only account) as the empty string', () => {
		expect(passwordFingerprint(null)).toBe(passwordFingerprint(''))
		expect(passwordFingerprint(undefined)).toBe(passwordFingerprint(''))
	})
})

describe('resetCooldownRemaining', () => {
	const now = new Date('2026-11-11T10:00:00.000Z')

	it('allows a request when none was made before', () => {
		expect(resetCooldownRemaining(null, now)).toBe(0)
	})

	it('reports the seconds left inside the cooldown window', () => {
		expect(resetCooldownRemaining(new Date(now.getTime() - 10_000), now)).toBe(20)
		expect(resetCooldownRemaining(new Date(now.getTime() - 1_000), now)).toBe(29)
		expect(resetCooldownRemaining(now, now)).toBe(RESET_COOLDOWN_SECONDS)
	})

	it('allows a request once 30 seconds have passed', () => {
		expect(resetCooldownRemaining(new Date(now.getTime() - 30_000), now)).toBe(0)
		expect(resetCooldownRemaining(new Date(now.getTime() - 120_000), now)).toBe(0)
	})
})

describe('isWellFormedEmail', () => {
	it('accepts normal addresses on any domain', () => {
		expect(isWellFormedEmail('a@gmail.com')).toBe(true)
		expect(isWellFormedEmail('student@school.edu.ph')).toBe(true)
	})

	it('rejects malformed addresses', () => {
		expect(isWellFormedEmail('nope')).toBe(false)
		expect(isWellFormedEmail('a@b')).toBe(false)
		expect(isWellFormedEmail('a b@c.com')).toBe(false)
	})
})
