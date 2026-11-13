// Preservation tests (observed on UNFIXED code): auth, lifecycle and recipe behavior
// that must stay identical after the unverified-signup / cleanup / Google / loading fix.
// These must PASS before and after the fix.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	process.env.GOOGLE_CLIENT_ID = 'cid'
	process.env.GOOGLE_CLIENT_SECRET = 'csecret'
	return {
		state: {
			body: {} as any,
			params: {} as Record<string, string>,
			query: {} as Record<string, any>,
			headers: {} as Record<string, string>,
			users: [] as any[],
			calls: [] as string[],
			googleEmail: 'g@gmail.com',
		},
	}
})

vi.mock('../lib/prisma', () => {
	const match = (u: any, where: any) =>
		Object.entries(where).every(([k, v]) => (v && typeof v === 'object' ? true : u[k] === v))
	const user = {
		findUnique: vi.fn(async ({ where }: any) => h.state.users.find((u) => match(u, where)) ?? null),
		findFirst: vi.fn(async ({ where }: any) => h.state.users.find((u) => match(u, where)) ?? null),
		findMany: vi.fn(async () => []),
		update: vi.fn(async ({ where, data }: any) => {
			const u = h.state.users.find((x) => match(x, where))
			if (u) Object.assign(u, data)
			return u
		}),
		updateMany: vi.fn(async () => ({ count: 0 })),
		create: vi.fn(async ({ data }: any) => {
			h.state.calls.push('create')
			const row = { id: h.state.users.length + 100, ...data }
			h.state.users.push(row)
			return row
		}),
	}
	const tx = {
		user,
		dietaryProfile: { create: vi.fn(async () => { h.state.calls.push('dietaryProfile') ; return {} }) },
	}
	return { prisma: { user, $transaction: async (cb: any) => cb(tx) } }
})
vi.mock('../utils/email', () => ({
	generateVerificationToken: () => 'plain-token',
	sendVerificationEmail: vi.fn(async () => { h.state.calls.push('sendEmail'); return { success: true } }),
	sendWelcomeEmail: vi.fn(async () => { h.state.calls.push('welcome'); return { success: true } }),
	sendAccountArchivedEmail: vi.fn(async () => ({ success: true })),
	sendAccountDeletedEmail: vi.fn(async () => ({ success: true })),
	isAllowedEmailDomain: () => true,
}))
vi.mock('../lib/audit-logger', () => ({ logAuditEvent: vi.fn(async () => {}) }))
vi.mock('../lib/google-avatar', () => ({ fetchGoogleAvatarAsDataUri: vi.fn(async () => null) }))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(async () => true), hash: vi.fn(async () => 'hashed') } }))
vi.mock('google-auth-library', () => ({
	OAuth2Client: class {
		async verifyIdToken() {
			return {
				getPayload: () => ({
					email: h.state.googleEmail, email_verified: true, given_name: 'G', family_name: 'User', sub: 'gid-1',
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
		getRouterParam: vi.fn((_e: any, k: string) => h.state.params[k]),
		getQuery: vi.fn(() => h.state.query),
		getHeader: vi.fn((_e: any, k: string) => h.state.headers[k]),
		sendRedirect: vi.fn(async (_e: any, url: string) => url),
	}
})
vi.stubGlobal('$fetch', vi.fn(async (url: string) =>
	String(url).includes('token')
		? { access_token: 'at', id_token: 'it' }
		: { id: 'gid-1', email: h.state.googleEmail, verified_email: true, given_name: 'G', family_name: 'User' },
))

import registerHandler from '../api/auth/register.post'
import verifyLinkHandler from '../api/auth/verify/[token].get'
import checkUsernameHandler from '../api/auth/check-username.post'
import loginHandler from '../api/auth/login.post'
import googleVerifyHandler from '../api/auth/google/verify.post'
import googleCallbackHandler from '../api/auth/google/callback.get'
import cleanupArchivedHandler from '../api/cron/cleanup-archived.get'
import { sendVerificationEmail, sendWelcomeEmail } from '../utils/email'

const base = { first_name: 'Zar', last_name: 'Rin', password: 'Passw0rd!', gender: 'Male', birthday: '1990-01-01' }
const usernameArb = fc.stringMatching(/^[a-zA-Z0-9_]{4,15}$/)
const verifiedUser = (over: any = {}) => ({
	id: 1, name: 'V User', email: 'v@gmail.com', username: 'taken_name', email_verified: true, oauth_provider: null,
	avatar_base64: null, status: 'ACTIVE', password: 'hashed', ...over,
})

beforeEach(() => {
	h.state.users = []
	h.state.calls = []
	h.state.params = {}
	h.state.query = {}
	h.state.headers = {}
	h.state.body = {}
	h.state.googleEmail = 'g@gmail.com'
	vi.mocked(sendVerificationEmail).mockClear()
	vi.mocked(sendWelcomeEmail).mockClear()
})

describe('verification link', () => {
	it('marks verified, clears token, sends welcome email and returns a session token', async () => {
		h.state.users = [{
			id: 5, name: 'U', email: 'u@gmail.com', email_verified: false,
			verification_token: 'tok-1', verification_token_expires_at: new Date(Date.now() + 3600_000),
		}]
		h.state.params = { token: 'tok-1' }
		const res: any = await verifyLinkHandler({} as any)
		expect(res.success).toBe(true)
		expect(typeof res.token).toBe('string')
		expect(res.user).toMatchObject({ id: 5, email: 'u@gmail.com' })
		expect(h.state.users[0]).toMatchObject({ email_verified: true, verification_token: null })
		expect(sendWelcomeEmail).toHaveBeenCalledTimes(1)
	})
})

describe('register', () => {
	it('new email: sends email first, then creates user + dietary profile, requiresVerification true', async () => {
		await fc.assert(fc.asyncProperty(usernameArb, async (username) => {
			h.state.users = []
			h.state.calls = []
			h.state.body = { ...base, username, email: 'new@gmail.com' }
			const res: any = await registerHandler({} as any)
			expect(res.requiresVerification).toBe(true)
			expect(res.email).toBe('new@gmail.com')
			expect(h.state.calls).toEqual(['sendEmail', 'create', 'dietaryProfile'])
			expect(h.state.users[0].email_verified).toBe(false)
		}), { numRuns: 25 })
	})

	it('unverified re-register obeys the 60s cooldown and resends afterwards', async () => {
		await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 55 }), fc.integer({ min: 65, max: 5000 }), async (young, old) => {
			const mk = (secs: number) => [{
				id: 9, name: 'Old', email: 'a@gmail.com', email_verified: false,
				last_verification_sent_at: new Date(Date.now() - secs * 1000),
			}]
			h.state.body = { ...base, username: 'abcd_1', email: 'a@gmail.com' }
			h.state.users = mk(young)
			await expect(registerHandler({} as any)).rejects.toMatchObject({ statusCode: 429 })
			h.state.users = mk(old)
			const res: any = await registerHandler({} as any)
			expect(res.requiresVerification).toBe(true)
			expect(res.email).toBe('a@gmail.com')
		}), { numRuns: 20 })
	})

	it('verified email re-register is rejected', async () => {
		h.state.users = [verifiedUser({ email: 'v@gmail.com' })]
		h.state.body = { ...base, username: 'fresh_1', email: 'v@gmail.com' }
		await expect(registerHandler({} as any)).rejects.toMatchObject({ statusCode: 400 })
		expect(sendVerificationEmail).not.toHaveBeenCalled()
	})

	it('username held by a verified user is rejected by register and check-username', async () => {
		await fc.assert(fc.asyncProperty(usernameArb, async (username) => {
			h.state.users = [verifiedUser({ username })]
			h.state.body = { ...base, username, email: 'other@gmail.com' }
			await expect(registerHandler({} as any)).rejects.toMatchObject({
				statusCode: 400, statusMessage: 'That username is already taken. Please choose another.',
			})
			h.state.body = { username }
			const res: any = await checkUsernameHandler({} as any)
			expect(res.available).toBe(false)
			// an unheld name is available
			h.state.users = []
			expect(((await checkUsernameHandler({} as any)) as any).available).toBe(true)
		}), { numRuns: 25 })
	})
})

describe('login', () => {
	it('email login of an unverified account returns 403 with the email', async () => {
		h.state.users = [verifiedUser({ email: 'u@gmail.com', email_verified: false })]
		h.state.body = { identifier: 'u@gmail.com', password: 'whatever' }
		await expect(loginHandler({} as any)).rejects.toMatchObject({
			statusCode: 403, data: { requiresVerification: true, email: 'u@gmail.com' },
		})
	})
})

describe('Google flows without register intent', () => {
	it('verify.post logs in an existing user (including ARCHIVED) and returns a token', async () => {
		h.state.users = [verifiedUser({ email: 'g@gmail.com', oauth_provider: 'google', status: 'ARCHIVED' })]
		h.state.body = { idToken: 'tok' }
		const res: any = await googleVerifyHandler({} as any)
		expect(res).toMatchObject({ success: true, requiresRegistration: false })
		expect(typeof res.token).toBe('string')
		const { prisma } = await import('../lib/prisma')
		expect((prisma.user.updateMany as any)).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 1, status: 'ARCHIVED' }, data: expect.objectContaining({ status: 'ACTIVE' }) }),
		)
	})

	it('verify.post returns requiresRegistration + pendingToken for a new Google user', async () => {
		h.state.users = []
		h.state.body = { idToken: 'tok' }
		const res: any = await googleVerifyHandler({} as any)
		expect(res).toMatchObject({ success: true, requiresRegistration: true })
		expect(typeof res.pendingToken).toBe('string')
	})

	it('callback.get without register state redirects an existing user with oauth_token', async () => {
		h.state.users = [verifiedUser({ email: 'g@gmail.com', oauth_provider: 'google' })]
		h.state.query = { code: 'abc' }
		const url: any = await googleCallbackHandler({} as any)
		expect(url).toContain('/tabs/home?oauth_token=')
	})

	it('callback.get redirects a new Google user to register with oauth_pending', async () => {
		h.state.users = []
		h.state.query = { code: 'abc' }
		const url: any = await googleCallbackHandler({} as any)
		expect(url).toContain('/register?oauth_pending=')
	})
})

describe('cleanup-archived cron', () => {
	it('rejects with 401 when CRON_SECRET is set and the bearer is wrong', async () => {
		process.env.CRON_SECRET = 'cron-secret'
		try {
			h.state.headers = { authorization: 'Bearer nope' }
			await expect(cleanupArchivedHandler({} as any)).rejects.toMatchObject({ statusCode: 401 })
		} finally {
			delete process.env.CRON_SECRET
		}
	})
})

describe('Recipe make flow (source)', () => {
	const src = readFileSync(resolve(__dirname, '../../../omniscan-ui/src/views/RecipeSuggestions.vue'), 'utf-8')
	it('keeps the success toast and the confirm alert text', () => {
		expect(src).toContain('Recipe marked as made!')
		expect(src).toContain('header="Make this recipe?"')
		expect(src).toContain('This will reduce your pantry quantities for')
		expect(src).toContain('Continue?')
	})
})
