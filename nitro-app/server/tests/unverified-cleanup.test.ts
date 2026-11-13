import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import {
	selectUnverifiedAccountsForDeletion,
	UNVERIFIED_ACCOUNT_RETENTION_DAYS,
} from '../lib/unverified-cleanup'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-06-30T00:00:00Z')

describe('selectUnverifiedAccountsForDeletion', () => {
	const mk = (ms: number) => ({
		id: 1,
		email_verified: false,
		oauth_provider: null,
		created_at: new Date(now.getTime() - ms),
	})

	it('keeps accounts at exactly 7 days, deletes at 7 days + 1ms', () => {
		expect(selectUnverifiedAccountsForDeletion([mk(7 * DAY)], now)).toHaveLength(0)
		expect(selectUnverifiedAccountsForDeletion([mk(7 * DAY + 1)], now)).toHaveLength(1)
	})

	/** **Validates: Requirements 2.3** */
	it('property: selection equals the spec predicate', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						email_verified: fc.boolean(),
						oauth_provider: fc.constantFrom(null, 'google'),
						ageMs: fc.integer({ min: 0, max: 30 * DAY }),
					}),
					{ maxLength: 20 },
				),
				(rows) => {
					const users = rows.map((r, i) => ({
						id: i,
						email_verified: r.email_verified,
						oauth_provider: r.oauth_provider,
						created_at: new Date(now.getTime() - r.ageMs),
					}))
					const expected = users
						.filter(
							(u) =>
								!u.email_verified &&
								u.oauth_provider === null &&
								now.getTime() - u.created_at.getTime() > UNVERIFIED_ACCOUNT_RETENTION_DAYS * DAY,
						)
						.map((u) => u.id)
					expect(selectUnverifiedAccountsForDeletion(users, now).map((u) => u.id)).toEqual(expected)
				},
			),
		)
	})
})

const calls: string[] = []
const tx = {
	activityLog: { deleteMany: vi.fn(async () => { calls.push('activityLog') }) },
	notification: { deleteMany: vi.fn(async () => { calls.push('notification') }) },
	dietaryProfile: { deleteMany: vi.fn(async () => { calls.push('dietaryProfile') }) },
	pantryItem: { deleteMany: vi.fn(async () => { calls.push('pantryItem') }) },
	recipeInteraction: { deleteMany: vi.fn(async () => { calls.push('recipeInteraction') }) },
	scan: {
		findMany: vi.fn(async () => [{ id: 9 }]),
		deleteMany: vi.fn(async () => { calls.push('scan') }),
	},
	flaggedScan: { deleteMany: vi.fn(async () => { calls.push('flaggedScan') }) },
	user: { deleteMany: vi.fn(async () => { calls.push('user'); return { count: 1 } }) },
}
const prismaMock = {
	user: {
		findMany: vi.fn(async () => [
			{ id: 1, email_verified: false, oauth_provider: null, created_at: new Date(Date.now() - 8 * DAY) },
			{ id: 2, email_verified: false, oauth_provider: null, created_at: new Date() },
		]),
	},
	$transaction: vi.fn(async (fn: any) => fn(tx)),
}

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

describe('cleanup-unverified endpoint', () => {
	beforeEach(() => {
		calls.length = 0
		delete process.env.CRON_SECRET
	})

	it('deletes children before users, only for selected ids', async () => {
		const handler = (await import('../api/cron/cleanup-unverified.get')).default as any
		const res = await handler({ node: { req: { headers: {} } }, headers: new Headers() })
		expect(res.deletedUnverifiedUsers).toBe(1)
		expect(calls.at(-1)).toBe('user')
		expect(calls.indexOf('flaggedScan')).toBeLessThan(calls.indexOf('scan'))
		expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [1] } } })
	})
})
