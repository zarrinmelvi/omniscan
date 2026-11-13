// Bug condition exploration (cleanup): unverified, non-Google accounts older than
// 7 days must be selected for deletion. EXPECTED TO FAIL on unfixed code
// (module ../lib/unverified-cleanup does not exist).

import { describe, it, expect } from 'vitest'
import { selectUnverifiedAccountsForDeletion, UNVERIFIED_ACCOUNT_RETENTION_DAYS } from '../lib/unverified-cleanup'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-06-30T00:00:00Z')
const ago = (days: number) => new Date(now.getTime() - days * DAY)

describe('Bug condition: unverified account cleanup', () => {
	it('retention is 7 days', () => {
		expect(UNVERIFIED_ACCOUNT_RETENTION_DAYS).toBe(7)
	})

	it('selects only unverified, non-Google users older than 7 days', () => {
		const users = [
			{ id: 1, email_verified: false, oauth_provider: null, created_at: ago(8) },
			{ id: 2, email_verified: false, oauth_provider: null, created_at: ago(6) },
			{ id: 3, email_verified: true, oauth_provider: null, created_at: ago(30) },
			{ id: 4, email_verified: false, oauth_provider: 'google', created_at: ago(30) },
			{ id: 5, email_verified: true, oauth_provider: 'google', created_at: ago(30) },
		]
		expect(selectUnverifiedAccountsForDeletion(users as any, now).map((u: any) => u.id)).toEqual([1])
	})
})
