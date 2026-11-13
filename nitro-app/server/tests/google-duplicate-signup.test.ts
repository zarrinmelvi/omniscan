// Google sign-up intent: existing email + register intent -> 409 / redirect, no session.
// Login intent is unchanged.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import jwt from 'jsonwebtoken'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	process.env.GOOGLE_CLIENT_ID = 'cid'
	process.env.GOOGLE_CLIENT_SECRET = 'csecret'
	return {
		state: { body: {} as any, query: {} as any, existing: null as any },
		update: null as any,
		updateMany: null as any,
	}
})

vi.mock('google-auth-library', () => ({
	OAuth2Client: class {
		async verifyIdToken() {
			return {
				getPayload: () => ({
					email: 'exists@gmail.com', email_verified: true, given_name: 'Ex', family_name: 'Ists', sub: 'gid-1',
				}),
			}
		}
	},
}))
vi.mock('../lib/prisma', () => {
	const user = {
		findUnique: vi.fn(async () => h.state.existing),
		findFirst: vi.fn(async () => null),
		update: vi.fn(async () => ({})),
		updateMany: vi.fn(async () => ({ count: 0 })),
	}
	h.update = user.update
	h.updateMany = user.updateMany
	return { prisma: { user, $transaction: vi.fn() } }
})
vi.mock('../lib/audit-logger', () => ({ logAuditEvent: vi.fn(async () => {}) }))
vi.mock('../lib/google-avatar', () => ({ fetchGoogleAvatarAsDataUri: vi.fn(async () => null) }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return {
		...actual,
		readBody: vi.fn(async () => h.state.body),
		getQuery: vi.fn(() => h.state.query),
		sendRedirect: vi.fn(async (_e: any, url: string) => url),
	}
})
vi.stubGlobal('$fetch', vi.fn(async (url: string) =>
	String(url).includes('token')
		? { access_token: 'at', id_token: 'it' }
		: { id: 'gid-1', email: 'exists@gmail.com', verified_email: true, given_name: 'Ex', family_name: 'Ists' },
))

import verifyHandler from '../api/auth/google/verify.post'
import registerHandler from '../api/auth/google/register.post'
import callbackHandler from '../api/auth/google/callback.get'
import { parseGoogleState } from '../lib/google-intent'

const anyWrites = () => h.update.mock.calls.length + h.updateMany.mock.calls.length

beforeEach(() => {
	h.update.mockClear()
	h.updateMany.mockClear()
	h.state.query = {}
	h.state.existing = { id: 7, email: 'exists@gmail.com', oauth_provider: null, avatar_base64: null, status: 'ACTIVE' }
})

describe('parseGoogleState', () => {
	it('parses known states', () => {
		expect(parseGoogleState('')).toEqual({ mobile: false, intent: 'login' })
		expect(parseGoogleState(undefined)).toEqual({ mobile: false, intent: 'login' })
		expect(parseGoogleState('mobile')).toEqual({ mobile: true, intent: 'login' })
		expect(parseGoogleState('register')).toEqual({ mobile: false, intent: 'register' })
		expect(parseGoogleState('mobile:register')).toEqual({ mobile: true, intent: 'register' })
		expect(parseGoogleState('garbage')).toEqual({ mobile: false, intent: 'login' })
	})

	it('intent is register iff state contains register', () => {
		fc.assert(
			fc.property(fc.string(), (s) => parseGoogleState(s).intent === (s.toLowerCase().includes('register') ? 'register' : 'login')),
		)
	})
})

describe('google/verify.post', () => {
	it('register intent + existing user -> 409, no updates, no token', async () => {
		h.state.body = { idToken: 'tok', intent: 'register' }
		await expect(verifyHandler({} as any)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'Account already exist' })
		expect(anyWrites()).toBe(0)
	})

	it('login intent (default) still issues a token', async () => {
		h.state.body = { idToken: 'tok' }
		const res: any = await verifyHandler({} as any)
		expect(res.token).toEqual(expect.any(String))
		expect(res.requiresRegistration).toBe(false)
	})

	it('login intent restores ARCHIVED users', async () => {
		h.state.existing.status = 'ARCHIVED'
		h.state.body = { idToken: 'tok', intent: 'login' }
		const res: any = await verifyHandler({} as any)
		expect(res.token).toBeTruthy()
		expect(h.updateMany).toHaveBeenCalled()
	})
})

describe('google/register.post', () => {
	it('existing email -> 409 Account already exist', async () => {
		const pending_token = jwt.sign(
			{ type: 'google_pending', email: 'exists@gmail.com', firstName: 'Ex', lastName: 'Ists', googleId: 'gid-1' },
			'test-secret',
		)
		h.state.body = { pending_token, username: 'newname', gender: 'Male', birthday: '1990-01-01' }
		await expect(registerHandler({} as any)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'Account already exist' })
		expect(anyWrites()).toBe(0)
	})
})

describe('google/callback.get', () => {
	it.each(['register', 'mobile:register'])('state=%s + existing user redirects to register with account_exists', async (state) => {
		h.state.query = { code: 'abc', state }
		const url: any = await callbackHandler({} as any)
		expect(url).toContain('/register?oauth_error=account_exists')
		expect(url).not.toContain('oauth_token')
		expect(anyWrites()).toBe(0)
	})

	it('no state still logs in an existing user', async () => {
		h.state.query = { code: 'abc' }
		const url: any = await callbackHandler({} as any)
		expect(url).toContain('/tabs/home?oauth_token=')
	})

	it('state=mobile still redirects to the native scheme', async () => {
		h.state.query = { code: 'abc', state: 'mobile' }
		const url: any = await callbackHandler({} as any)
		expect(url).toContain('io.ionic.starter://google-auth-callback?oauth_token=')
	})

	it('register intent + new user still gets oauth_pending', async () => {
		h.state.existing = null
		h.state.query = { code: 'abc', state: 'register' }
		const url: any = await callbackHandler({} as any)
		expect(url).toContain('/register?oauth_pending=')
	})
})
