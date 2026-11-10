// Bug condition exploration tests (Property 1) for the account lifecycle fix.
// These encode the EXPECTED behavior and are meant to FAIL on unfixed code.
//
// Prisma and server/utils/email.ts are mocked. The Prisma fake is a small
// in-memory store that mimics `updated_at` auto-bumping on writes, so
// "countdown keyed on updated_at" bugs are observable.
//
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { EventEmitter } from 'events'

const DAY = 24 * 60 * 60 * 1000

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	delete process.env.CRON_SECRET

	const state: any = {
		users: [] as any[],
		events: [] as string[],
		failTx: false,
		body: {} as any,
		query: {} as any,
		redirects: [] as string[],
		fetchResults: [] as any[],
		jwtPayload: {} as any,
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
	const match = (row: any, where: any = {}) =>
		Object.entries(where).every(([k, c]) => matchVal(row[k], c))

	const touch = (row: any, data: any) => {
		Object.assign(row, data)
		row.updated_at = new Date()
	}

	const noopModel = () => ({
		deleteMany: async () => ({ count: 0 }),
		findMany: async () => [],
	})

	const userModel = {
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
			const before = state.users.length
			state.users = state.users.filter((u: any) => !match(u, where))
			return { count: before - state.users.length }
		},
	}

	const prisma: any = {
		user: userModel,
		pantryItem: { ...noopModel(), updateMany: async () => ({ count: 0 }) },
		activityLog: noopModel(),
		notification: noopModel(),
		dietaryProfile: noopModel(),
		recipeInteraction: noopModel(),
		scan: noopModel(),
		flaggedScan: noopModel(),
		$transaction: async (fn: any) => {
			if (state.failTx) throw new Error('tx failed')
			const r = await fn(prisma)
			state.events.push('tx:resolved')
			return r
		},
	}

	const email = {
		sendAccountArchivedEmail: vi.fn(async (to: string, name: string) => {
			state.events.push('email:archived')
			return { success: true }
		}),
		sendAccountDeletedEmail: vi.fn(async (to: string, name: string) => {
			state.events.push('email:deleted')
			return { success: true }
		}),
	}

	const resendSend = vi.fn(async () => ({ error: null }))

	return { state, prisma, email, resendSend }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))
vi.mock('../utils/email', () => h.email)
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
		sendRedirect: vi.fn(async (_e: any, url: string) => {
			h.state.redirects.push(url)
			return url
		}),
	}
})

import cleanupHandler from '../api/cron/cleanup-archived.get'
import loginHandler from '../api/auth/login.post'
import googleCallbackHandler from '../api/auth/google/callback.get'
import googleVerifyHandler from '../api/auth/google/verify.post'
import { handleSessionStream } from '../lib/session-stream'

const fakeEvent = () => ({ node: { req: { headers: {}, url: '/' }, res: {} } }) as any

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

const archivedUser = (daysArchived: number, over: any = {}) =>
	makeUser({
		status: 'ARCHIVED',
		last_active: new Date(Date.now() - 200 * DAY),
		archived_at: new Date(Date.now() - daysArchived * DAY),
		updated_at: new Date(Date.now() - daysArchived * DAY),
		inactivity_warning_sent_at: new Date(Date.now() - 170 * DAY),
		...over,
	})

const expectRestored = (before: number) => {
	const u = h.state.users[0]
	expect(u.status).toBe('ACTIVE')
	expect(u.archived_at).toBeNull()
	expect(u.inactivity_warning_sent_at).toBeNull()
	expect(u.last_active.getTime()).toBeGreaterThanOrEqual(before)
}

beforeEach(() => {
	h.state.users = []
	h.state.events = []
	h.state.failTx = false
	h.state.body = {}
	h.state.query = {}
	h.state.redirects = []
	h.state.fetchResults = []
	h.email.sendAccountArchivedEmail.mockClear()
	h.email.sendAccountDeletedEmail.mockClear()
	h.resendSend.mockClear()
	vi.stubGlobal('$fetch', async () => h.state.fetchResults.shift())
})

describe('Property 1: DELETE_RUN - deletion email', () => {
	it('sends one deletion email with pre-deletion email/name after $transaction resolves', async () => {
		h.state.users = [archivedUser(8)]
		await (cleanupHandler as any)(fakeEvent())

		expect(h.state.users).toHaveLength(0)
		expect(h.email.sendAccountDeletedEmail).toHaveBeenCalledTimes(1)
		expect(h.email.sendAccountDeletedEmail).toHaveBeenCalledWith('user@gmail.com', 'Ada')
		expect(h.state.events.indexOf('tx:resolved')).toBeGreaterThanOrEqual(0)
		expect(h.state.events.indexOf('email:deleted')).toBeGreaterThan(h.state.events.indexOf('tx:resolved'))
	})

	it('property: any user archived 8-400 days ago gets exactly one deletion email', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.integer({ min: 8, max: 400 }),
				fc.emailAddress(),
				fc.string({ minLength: 1, maxLength: 20 }),
				async (days, email, name) => {
					h.state.users = [archivedUser(days, { email, name })]
					h.state.events = []
					h.email.sendAccountDeletedEmail.mockClear()
					await (cleanupHandler as any)(fakeEvent())
					expect(h.state.users).toHaveLength(0)
					expect(h.email.sendAccountDeletedEmail).toHaveBeenCalledTimes(1)
					expect(h.email.sendAccountDeletedEmail).toHaveBeenCalledWith(email, name)
				},
			),
			{ numRuns: 15 },
		)
	})

	it('edge: when $transaction throws, no deletion email is sent', async () => {
		h.state.users = [archivedUser(8)]
		h.state.failTx = true
		await (cleanupHandler as any)(fakeEvent()).catch(() => {})
		expect(h.email.sendAccountDeletedEmail).not.toHaveBeenCalled()
		expect(h.state.users).toHaveLength(1)
	})
})

describe('Property 1: countdown stability', () => {
	it('deletes an account whose archived_at is old even if updated_at is recent', async () => {
		h.state.users = [archivedUser(10, { updated_at: new Date(Date.now() - 1 * DAY) })]
		await (cleanupHandler as any)(fakeEvent())
		expect(h.state.users).toHaveLength(0)
		expect(h.email.sendAccountDeletedEmail).toHaveBeenCalledTimes(1)
	})
})

describe('Property 1: USER_RETURN restores archived users', () => {
	const returnDays = fc.integer({ min: 0, max: 6 })

	it('login.post.ts restores ARCHIVED -> ACTIVE', async () => {
		await fc.assert(
			fc.asyncProperty(returnDays, async (days) => {
				h.state.users = [archivedUser(days)]
				h.state.body = { email: 'user@gmail.com', password: 'pw' }
				const before = Date.now()
				await (loginHandler as any)(fakeEvent())
				expectRestored(before)
			}),
			{ numRuns: 7 },
		)
	})

	it('google/callback.get.ts restores ARCHIVED -> ACTIVE', async () => {
		await fc.assert(
			fc.asyncProperty(returnDays, async (days) => {
				h.state.users = [archivedUser(days)]
				h.state.query = { code: 'abc' }
				h.state.fetchResults = [
					{ access_token: 'at', id_token: 'it' },
					{ id: 'gid', email: 'user@gmail.com', verified_email: true, given_name: 'Ada' },
				]
				const before = Date.now()
				await (googleCallbackHandler as any)(fakeEvent())
				expectRestored(before)
			}),
			{ numRuns: 7 },
		)
	})

	it('google/verify.post.ts restores ARCHIVED -> ACTIVE', async () => {
		await fc.assert(
			fc.asyncProperty(returnDays, async (days) => {
				h.state.users = [archivedUser(days)]
				h.state.body = { idToken: 'tok' }
				const before = Date.now()
				await (googleVerifyHandler as any)(fakeEvent())
				expectRestored(before)
			}),
			{ numRuns: 7 },
		)
	})

	it('session-stream heartbeat restores ARCHIVED -> ACTIVE', async () => {
		h.state.users = [archivedUser(3)]
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
		// Heartbeat runs on the immediate check at connect.
		await vi.waitFor(() => {
			expect(h.state.users[0].last_active.getTime()).toBeGreaterThanOrEqual(before)
		})
		req.emit('close')
		await done
		expectRestored(before)
	})
})

describe('Property 1: ARCHIVE_RUN', () => {
	it('archives an ACTIVE user inactive 180+ days with archived_at = now and one archive email', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 181, max: 900 }), async (days) => {
				h.state.users = [makeUser({ last_active: new Date(Date.now() - days * DAY) })]
				h.state.events = []
				h.email.sendAccountArchivedEmail.mockClear()
				const start = Date.now()
				await (cleanupHandler as any)(fakeEvent())
				const u = h.state.users[0]
				expect(u.status).toBe('ARCHIVED')
				expect(u.archived_at).toBeInstanceOf(Date)
				expect(u.archived_at.getTime()).toBeGreaterThanOrEqual(start)
				expect(h.email.sendAccountArchivedEmail).toHaveBeenCalledTimes(1)
			}),
			{ numRuns: 10 },
		)
	})

	it('running the archive step twice sends only one archive email', async () => {
		h.state.users = [makeUser({ last_active: new Date(Date.now() - 200 * DAY) })]
		await (cleanupHandler as any)(fakeEvent())
		await (cleanupHandler as any)(fakeEvent())
		expect(h.email.sendAccountArchivedEmail).toHaveBeenCalledTimes(1)
		expect(h.state.users[0].archived_at).toBeInstanceOf(Date)
	})

	it('archive email body tells the user to log in within 7 days', async () => {
		const actual: any = await vi.importActual('../utils/email')
		await actual.sendAccountArchivedEmail('user@gmail.com', 'Ada')
		expect(h.resendSend).toHaveBeenCalledTimes(1)
		const arg: any = (h.resendSend.mock.calls[0] as any[])[0]
		const text = `${arg.subject} ${arg.html}`.toLowerCase()
		expect(text).toMatch(/log ?in|sign ?in/)
		expect(text).toMatch(/7 days|seven days|1 week|one week/)
		// Subject must carry the call to action, not just "has been archived".
		expect(String(arg.subject).toLowerCase()).toMatch(/7 days|seven days|1 week|one week|log ?in/)
	})
})
