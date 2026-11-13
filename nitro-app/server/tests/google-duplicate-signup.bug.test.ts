// Bug condition exploration (Google sign-up with an existing email): must respond
// 409 "Account already exist" and never write a session token.
// EXPECTED TO FAIL on unfixed code.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	process.env.GOOGLE_CLIENT_ID = 'cid'
	return {
		state: { body: {} as any, existing: null as any },
		update: null as any,
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
	return { prisma: { user, $transaction: vi.fn(async (cb: any) => cb({ user: { create: vi.fn() }, dietaryProfile: { create: vi.fn() } })) } }
})
vi.mock('../lib/audit-logger', () => ({ logAuditEvent: vi.fn(async () => {}) }))
vi.mock('../lib/google-avatar', () => ({ fetchGoogleAvatarAsDataUri: vi.fn(async () => null) }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import verifyHandler from '../api/auth/google/verify.post'
import registerHandler from '../api/auth/google/register.post'
import jwt from 'jsonwebtoken'

const sessionTokenWrites = () =>
	h.update.mock.calls.filter((c: any[]) => c[0]?.data && 'session_token' in c[0].data)

beforeEach(() => {
	h.update.mockClear()
	h.state.existing = {
		id: 7, email: 'exists@gmail.com', oauth_provider: null, avatar_base64: null, status: 'ACTIVE',
	}
})

describe('Bug condition: Google sign-up for an existing email', () => {
	it('verify.post with intent "register" responds 409 and writes no session token', async () => {
		h.state.body = { idToken: 'tok', intent: 'register' }
		let result: any
		let error: any
		try { result = await verifyHandler({} as any) } catch (e) { error = e }
		expect(error, `returned ${JSON.stringify(result)}`).toMatchObject({ statusCode: 409, statusMessage: 'Account already exist' })
		expect(sessionTokenWrites()).toHaveLength(0)
	})

	it('register.post with an existing email responds 409 "Account already exist"', async () => {
		const pending_token = jwt.sign(
			{ type: 'google_pending', email: 'exists@gmail.com', firstName: 'Ex', lastName: 'Ists', googleId: 'gid-1' },
			'test-secret',
		)
		h.state.body = { pending_token, username: 'newname', gender: 'Male', birthday: '1990-01-01' }
		await expect(registerHandler({} as any)).rejects.toMatchObject({ statusCode: 409, statusMessage: 'Account already exist' })
		expect(sessionTokenWrites()).toHaveLength(0)
	})
})
