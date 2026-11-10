// Preservation tests (Property 2) for the account lifecycle fix.
// Baseline behavior that must hold both BEFORE and AFTER the fix.
// Inputs here are all outside isBugCondition, so these PASS on unfixed code.
//
// The 30-day warning removal check lives in account-lifecycle.no-30day.test.ts
// because it is expected to fail until task 3.10.
//
// Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { EventEmitter } from 'events'

const DAY = 24 * 60 * 60 * 1000

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	delete process.env.CRON_SECRET

	const state: any = {
		users: [] as any[],
		txCalls: [] as string[],
		txUserDeleteWhere: null as any,
		scans: [] as any[],
		pantryItems: [] as any[],
		pantryUpdates: [] as any[],
		body: {} as any,
		query: {} as any,
		fetchResults: [] as any[],
		jwtPayload: {} as any,
		adminRows: [] as any[],
	}

	const matchVal = (rowVal: any, cond: any): boolean => {
		const v = rowVal === undefined ? null : rowVal
		if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
			if ('lt' in cond) return v !== null && v < cond.lt
			if ('in' in cond) return cond.in.includes(v)
			return true
		}
		return v === cond
	}
	const match = (row: any, where: any = {}) => Object.entries(where).every(([k, c]) => matchVal(row[k], c))
	const touch = (row: any, data: any) => {
		Object.assign(row, data)
		row.updated_at = new Date()
	}

	const txModel = (name: string, extra: any = {}) => ({
		deleteMany: async () => {
			state.txCalls.push(`${name}.deleteMany`)
			return { count: 0 }
		},
		findMany: async () => [],
		...extra,
	})

	const prisma: any = {
		user: {
			findMany: async ({ where }: any) => state.users.filter((u: any) => match(u, where)).map((u: any) => ({ ...u })),
			findUnique: async ({ where }: any) => {
				const r = state.users.find((u: any) => match(u, where))
				return r ? { ...r } : null
			},
			update: async ({ where, data }: any) => {
				const r = state.users.find((u: any) => match(u, where))
				if (!r) throw new Error('not found')
				touch(r, data)
				return { ...r }
			},
			updateMany: async ({ where, data }: any) => {
				const rows = state.users.filter((u: any) => match(u, where))
				rows.forEach((r: any) => touch(r, data))
				return { count: rows.length }
			},
			deleteMany: async ({ where }: any) => {
				state.txCalls.push('user.deleteMany')
				state.txUserDeleteWhere = where
				const before = state.users.length
				state.users = state.users.filter((u: any) => !match(u, where))
				return { count: before - state.users.length }
			},
			count: async () => 0,
		},
		pantryItem: {
			findMany: async () => state.pantryItems,
			updateMany: async (args: any) => {
				state.pantryUpdates.push(args)
				return { count: args.where.id.in.length }
			},
			deleteMany: async () => {
				state.txCalls.push('pantryItem.deleteMany')
				return { count: 0 }
			},
		},
		activityLog: txModel('activityLog'),
		notification: txModel('notification'),
		dietaryProfile: txModel('dietaryProfile'),
		recipeInteraction: txModel('recipeInteraction'),
		scan: txModel('scan', { findMany: async () => state.scans }),
		flaggedScan: txModel('flaggedScan'),
		$transaction: async (fn: any) => {
			state.txCalls.push('tx:begin')
			const r = await fn(prisma)
			state.txCalls.push('tx:end')
			return r
		},
	}
	// Admin list needs findMany/count to return canned rows, handled via a separate model object
	const adminUser = {
		count: async () => 0,
		findMany: async () => state.adminRows,
	}

	const email = {
		sendAccountArchivedEmail: vi.fn(async () => ({ success: true })),
		sendAccountDeletedEmail: vi.fn(async () => ({ success: true })),
	}
	const resendSend = vi.fn(async () => ({ error: null }))

	return { state, prisma, adminUser, email, resendSend }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))
vi.mock('../utils/email', () => h.email)
vi.mock('../utils/requireAdminAuth', () => ({ requireAdminAuth: () => {} }))
vi.mock('../lib/audit-logger', () => ({ logAuditEvent: vi.fn(async () => {}) }))
vi.mock('../lib/admin-settings', () => ({ getAdminSettings: vi.fn(async () => ({})) }))
vi.mock('resend', () => ({
	Resend: class {
		emails = { send: h.resendSend }
	},
}))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(async () => true) } }))
vi.mock('jsonwebtoken', () => ({
	default: { sign: vi.fn(() => 'signed-token'), verify: vi.fn(() => h.state.jwtPayload) },
}))
vi.mock('../lib/oauth', () => ({
	GOOGLE_CLIENT_ID: 'cid',
	GOOGLE_CLIENT_SECRET: 'sec',
	GOOGLE_REDIRECT_URI: 'http://x/cb',
	GOOGLE_TOKEN_URL: 'http://x/token',
	GOOGLE_USERINFO_URL: 'http://x/userinfo',
	OAUTH_FRONTEND_SUCCESS: 'http://x/ok',
	OAUTH_FRONTEND_FAILURE: 'http://x/fail',
	isGoogleOAuthConfigured: () => true,
}))
vi.mock('google-auth-library', () => ({
	OAuth2Client: class {
		async verifyIdToken() {
			return {
				getPayload: () => ({
					email: 'user@gmail.com',
					email_verified: true,
					given_name: 'Ada',
					family_name: 'L',
					sub: 'gid',
				}),
			}
		}
	},
}))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return {
		...actual,
		readBody: vi.fn(async () => h.state.body),
		getQuery: vi.fn(() => h.state.query),
		sendRedirect: vi.fn(async (_e: any, url: string) => url),
	}
})

import cleanupHandler from '../api/cron/cleanup-archived.get'
import loginHandler from '../api/auth/login.post'
import googleCallbackHandler from '../api/auth/google/callback.get'
import googleVerifyHandler from '../api/auth/google/verify.post'
import adminUsersHandler from '../api/admin/users.get'
import { handleSessionStream } from '../lib/session-stream'

const fakeEvent = (headers: any = {}) => ({ node: { req: { headers, url: '/' }, res: {} }, context: { admin: {} } }) as any
// h3 getHeader reads event.node.req.headers (lowercased keys)
const run = (handler: any, headers: any = {}) => handler(fakeEvent(headers))

const makeUser = (over: any = {}) => ({
	id: 1,
	name: 'Ada',
	email: 'user@gmail.com',
	password: 'hash',
	email_verified: true,
	oauth_provider: 'google',
	oauth_provider_id: 'gid',
	status: 'ACTIVE',
	last_active: new Date(),
	updated_at: new Date(),
	archived_at: null,
	inactivity_warning_sent_at: null,
	session_token: 'sid-1',
	deleted_at: null,
	...over,
})

beforeEach(() => {
	delete process.env.CRON_SECRET
	h.state.users = []
	h.state.txCalls = []
	h.state.txUserDeleteWhere = null
	h.state.scans = []
	h.state.pantryItems = []
	h.state.pantryUpdates = []
	h.state.body = {}
	h.state.query = {}
	h.state.fetchResults = []
	h.state.adminRows = []
	h.email.sendAccountArchivedEmail.mockClear()
	h.email.sendAccountDeletedEmail.mockClear()
	h.resendSend.mockClear()
	vi.stubGlobal('$fetch', async () => h.state.fetchResults.shift())
})

describe('Property 2: cron retention (3.1, 3.3)', () => {
	it('ACTIVE users inactive < 180 days stay ACTIVE with no archive/deletion email', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.double({ min: 0, max: 179.5, noNaN: true }),
				fc.option(fc.double({ min: 0, max: 400, noNaN: true }), { nil: null }),
				async (days, warnedAgo) => {
					const warn = warnedAgo === null ? null : new Date(Date.now() - warnedAgo * DAY)
					h.state.users = [makeUser({ last_active: new Date(Date.now() - days * DAY), inactivity_warning_sent_at: warn })]
					h.email.sendAccountArchivedEmail.mockClear()
					h.email.sendAccountDeletedEmail.mockClear()
					await run(cleanupHandler)
					expect(h.state.users).toHaveLength(1)
					expect(h.state.users[0].status).toBe('ACTIVE')
					expect(h.email.sendAccountArchivedEmail).not.toHaveBeenCalled()
					expect(h.email.sendAccountDeletedEmail).not.toHaveBeenCalled()
				},
			),
			{ numRuns: 25 },
		)
	})

	it('ARCHIVED users < 7 days since archival are neither deleted nor emailed', async () => {
		await fc.assert(
			fc.asyncProperty(fc.double({ min: 0, max: 6.5, noNaN: true }), async (days) => {
				const t = new Date(Date.now() - days * DAY)
				h.state.users = [
					makeUser({
						status: 'ARCHIVED',
						last_active: new Date(Date.now() - 200 * DAY),
						archived_at: t,
						updated_at: t,
					}),
				]
				h.email.sendAccountArchivedEmail.mockClear()
				h.email.sendAccountDeletedEmail.mockClear()
				await run(cleanupHandler)
				expect(h.state.users).toHaveLength(1)
				expect(h.state.users[0].status).toBe('ARCHIVED')
				expect(h.email.sendAccountArchivedEmail).not.toHaveBeenCalled()
				expect(h.email.sendAccountDeletedEmail).not.toHaveBeenCalled()
			}),
			{ numRuns: 25 },
		)
	})
})

describe('Property 2: hard delete transaction contents (3.4)', () => {
	it('removes all child records and the user inside one transaction', async () => {
		const old = new Date(Date.now() - 9 * DAY)
		h.state.users = [makeUser({ status: 'ARCHIVED', archived_at: old, updated_at: old, last_active: old })]
		h.state.scans = [{ id: 10 }, { id: 11 }]
		const res = await run(cleanupHandler)

		expect(res.deletedUsers).toBe(1)
		expect(h.state.users).toHaveLength(0)
		const calls = h.state.txCalls as string[]
		const begin = calls.indexOf('tx:begin')
		const end = calls.indexOf('tx:end')
		expect(begin).toBeGreaterThanOrEqual(0)
		expect(end).toBeGreaterThan(begin)
		const inside = calls.slice(begin + 1, end)
		for (const c of [
			'activityLog.deleteMany',
			'notification.deleteMany',
			'dietaryProfile.deleteMany',
			'pantryItem.deleteMany',
			'recipeInteraction.deleteMany',
			'flaggedScan.deleteMany',
			'scan.deleteMany',
			'user.deleteMany',
		]) {
			expect(inside).toContain(c)
		}
		expect(inside.indexOf('flaggedScan.deleteMany')).toBeLessThan(inside.indexOf('scan.deleteMany'))
		expect(inside.indexOf('user.deleteMany')).toBe(inside.length - 1)
	})
})

describe('Property 2: pantry cleanup and cron auth (3.5)', () => {
	it('soft-deletes archived pantry items returned by the 7-day query', async () => {
		h.state.pantryItems = [{ id: 5 }, { id: 6 }]
		const res = await run(cleanupHandler)
		expect(res.deletedPantryItems).toBe(2)
		expect(h.state.pantryUpdates).toHaveLength(1)
		expect(h.state.pantryUpdates[0].where).toEqual({ id: { in: [5, 6] } })
		expect(h.state.pantryUpdates[0].data.deleted_at).toBeInstanceOf(Date)
	})

	it('rejects requests without the correct CRON_SECRET and accepts the correct one', async () => {
		process.env.CRON_SECRET = 's3cret'
		await expect(run(cleanupHandler)).rejects.toMatchObject({ statusCode: 401 })
		await expect(run(cleanupHandler, { authorization: 'Bearer wrong' })).rejects.toMatchObject({ statusCode: 401 })
		const ok = await run(cleanupHandler, { authorization: 'Bearer s3cret' })
		expect(ok.result).toBe('success')
		delete process.env.CRON_SECRET
	})
})

describe('Property 2: ACTIVE login / heartbeat unchanged (3.6)', () => {
	const activeUser = () =>
		makeUser({
			last_active: new Date(Date.now() - 40 * DAY),
			inactivity_warning_sent_at: new Date(Date.now() - 5 * DAY),
		})
	const expectActiveRefreshed = (before: number) => {
		const u = h.state.users[0]
		expect(u.status).toBe('ACTIVE')
		expect(u.archived_at).toBeNull()
		expect(u.inactivity_warning_sent_at).toBeNull()
		expect(u.last_active.getTime()).toBeGreaterThanOrEqual(before)
	}

	it('login.post.ts refreshes last_active and clears the warning stamp', async () => {
		h.state.users = [activeUser()]
		h.state.body = { email: 'user@gmail.com', password: 'pw' }
		const before = Date.now()
		await run(loginHandler)
		expectActiveRefreshed(before)
	})

	it('google/callback.get.ts refreshes last_active and clears the warning stamp', async () => {
		h.state.users = [activeUser()]
		h.state.query = { code: 'abc' }
		h.state.fetchResults = [
			{ access_token: 'at', id_token: 'it' },
			{ id: 'gid', email: 'user@gmail.com', verified_email: true, given_name: 'Ada' },
		]
		const before = Date.now()
		await run(googleCallbackHandler)
		expectActiveRefreshed(before)
	})

	it('google/verify.post.ts refreshes last_active and clears the warning stamp', async () => {
		h.state.users = [activeUser()]
		h.state.body = { idToken: 'tok' }
		const before = Date.now()
		await run(googleVerifyHandler)
		expectActiveRefreshed(before)
	})

	it('session-stream heartbeat refreshes last_active and clears the warning stamp', async () => {
		h.state.users = [activeUser()]
		h.state.jwtPayload = { userId: 1, sid: 'sid-1' }
		const req: any = new EventEmitter()
		req.headers = { authorization: 'Bearer abc' }
		const res: any = new EventEmitter()
		Object.assign(res, {
			setHeader() {},
			flushHeaders() {},
			write() {
				return true
			},
			end() {
				this.writableEnded = true
			},
			writableEnded: false,
			destroyed: false,
		})
		const before = Date.now()
		const done = handleSessionStream({ node: { req, res } } as any, 'user')
		await vi.waitFor(() => {
			expect(h.state.users[0].last_active.getTime()).toBeGreaterThanOrEqual(before)
		})
		req.emit('close')
		await done
		expectActiveRefreshed(before)
	})
})

describe('Property 2: admin Manage User Profiles statuses (3.7)', () => {
	const MS = DAY
	it('derives Active/Inactive/Archived and deletion_due from stored status (case-insensitive) and inactive days', async () => {
		const storedArb = fc.constantFrom('ACTIVE', 'active', 'Active', 'ARCHIVED', 'archived', 'Archived')
		// Boundary-heavy day choices: 29/30, 179/180, 186/187 plus random.
		const daysArb = fc.oneof(
			fc.constantFrom(0, 1, 29, 30, 31, 179, 180, 181, 186, 187, 188),
			fc.integer({ min: 0, max: 600 }),
		)
		await fc.assert(
			fc.asyncProperty(storedArb, daysArb, async (stored, d) => {
				const now = Date.now()
				// +0.5 day keeps floor((now - last_active)/day) === d despite clock drift
				const lastActive = new Date(now - (d + 0.5) * MS)
				h.state.adminRows = [
					{
						id: 1,
						name: 'Ada',
						username: null,
						email: 'ada@gmail.com',
						status: stored,
						last_active: lastActive,
						created_at: lastActive,
						avatar_base64: null,
						session_token: null,
						_count: { scan: 0, pantry_item: 0 },
					},
				]
				const orig = h.prisma.user
				h.prisma.user = h.adminUser
				try {
					const out: any = await run(adminUsersHandler)
					const row = out.users[0]
					const archived = stored.toLowerCase() === 'archived' || d >= 180
					const expected = archived ? 'Archived' : d >= 30 ? 'Inactive' : 'Active'
					expect(row.status).toBe(expected)
					expect(row.deletion_due).toBe(expected === 'Archived' && d >= 187)
					expect(row.inactive_days).toBe(d)
				} finally {
					h.prisma.user = orig
				}
			}),
			{ numRuns: 60 },
		)
	})
})

describe('Property 2: other emails unchanged (3.8)', () => {
	it('welcome and password reset emails keep their recipient, subject and link', async () => {
		const actual: any = await vi.importActual('../utils/email')

		await actual.sendWelcomeEmail('user@gmail.com', 'Ada')
		let arg: any = (h.resendSend.mock.calls[0] as any[])[0]
		expect(arg.to).toBe('user@gmail.com')
		expect(arg.subject).toBe('Welcome to OmniScan!')
		expect(arg.html).toContain('Ada')

		await actual.sendPasswordResetEmail('user@gmail.com', 'Ada', 'tok123')
		arg = (h.resendSend.mock.calls[1] as any[])[0]
		expect(arg.to).toBe('user@gmail.com')
		expect(arg.subject).toBe('Reset your OmniScan password')
		expect(arg.html).toContain('/reset-password?token=tok123')
	})

	it('new-flag notification export and archived-email export keep their names', async () => {
		const actual: any = await vi.importActual('../utils/email')
		for (const fn of [
			'sendWelcomeEmail',
			'sendPasswordResetEmail',
			'sendVerificationEmail',
			'sendNewFlagNotification',
			'sendAccountArchivedEmail',
		]) {
			expect(typeof actual[fn]).toBe('function')
		}
	})
})
