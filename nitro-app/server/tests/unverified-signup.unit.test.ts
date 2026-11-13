import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	return { state: { body: {} as any, users: [] as any[], param: '' } }
})

vi.mock('../lib/prisma', () => {
	const match = (u: any, where: any) => Object.entries(where).every(([k, v]) => u[k] === v)
	const find = async ({ where }: any) => h.state.users.find((u) => match(u, where)) ?? null
	const user = {
		findUnique: vi.fn(find),
		findFirst: vi.fn(find),
		update: vi.fn(async ({ where, data }: any) => {
			const u = h.state.users.find((x) => match(x, where))
			if (data.username != null && h.state.users.some((x) => x !== u && x.username === data.username)) {
				throw Object.assign(new Error('unique'), { code: 'P2002' })
			}
			Object.assign(u, data)
			return u
		}),
		create: vi.fn(async ({ data }: any) => {
			const row = { id: h.state.users.length + 1, ...data }
			h.state.users.push(row)
			return row
		}),
	}
	const tx = { user, dietaryProfile: { create: vi.fn(async () => ({})) } }
	return { prisma: { user, $transaction: async (cb: any) => cb(tx) } }
})
vi.mock('../utils/email', () => ({
	generateVerificationToken: () => 'plain',
	sendVerificationEmail: vi.fn(async () => ({ success: true })),
	sendWelcomeEmail: vi.fn(async () => ({ success: true })),
	isAllowedEmailDomain: () => true,
}))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(), hash: vi.fn(async () => 'hashed') } }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body), getRouterParam: vi.fn(() => h.state.param) }
})

import registerHandler from '../api/auth/register.post'
import verifyHandler from '../api/auth/verify/[token].get'
import resendHandler from '../api/auth/resend-verification.post'
import checkUsernameHandler from '../api/auth/check-username.post'
import { readPendingUsername } from '../lib/verification-token'

const base = { first_name: 'Zar', last_name: 'Rin', password: 'Passw0rd!', gender: 'Male', birthday: '1990-01-01' }
const reg = (username: string, email: string) => {
	h.state.body = { ...base, username, email }
	return registerHandler({} as any)
}
const verify = (email: string) => {
	h.state.param = h.state.users.find((u) => u.email === email).verification_token
	return verifyHandler({} as any) as Promise<any>
}

beforeEach(() => {
	h.state.users = []
})

describe('unverified signup: pending username', () => {
	it('creates the row with username null and carries the name in the token', async () => {
		await reg('zarrin_1', 'a@gmail.com')
		const row = h.state.users[0]
		expect(row.username).toBeNull()
		expect(readPendingUsername(row.verification_token)).toBe('zarrin_1')
	})

	it('check-username treats a pending name as available', async () => {
		await reg('zarrin_1', 'a@gmail.com')
		h.state.body = { username: 'zarrin_1' }
		expect(((await checkUsernameHandler({} as any)) as any).available).toBe(true)
	})

	it('first to verify wins; the second still verifies with null username', async () => {
		await reg('zarrin_1', 'a@gmail.com')
		await reg('zarrin_1', 'b@gmail.com')
		const rb = await verify('b@gmail.com')
		expect(rb.success).toBe(true)
		expect(h.state.users[1].username).toBe('zarrin_1')
		const ra = await verify('a@gmail.com')
		expect(ra.success).toBe(true)
		expect(ra.usernameTaken).toBe(true)
		expect(h.state.users[0].email_verified).toBe(true)
		expect(h.state.users[0].username).toBeNull()
	})

	it('verification saves the pending username when free', async () => {
		await reg('zarrin_1', 'a@gmail.com')
		const res = await verify('a@gmail.com')
		expect(res.usernameTaken).toBeUndefined()
		expect(h.state.users[0].username).toBe('zarrin_1')
	})

	it('a verified owner still rejects the username on register', async () => {
		h.state.users = [{ id: 9, email: 'v@gmail.com', username: 'zarrin_1', email_verified: true }]
		await expect(reg('zarrin_1', 'c@gmail.com')).rejects.toMatchObject({ statusCode: 400 })
	})

	it('existing-unverified re-register rejects a verified owner and carries a new username otherwise', async () => {
		await reg('zarrin_1', 'a@gmail.com')
		h.state.users[0].last_verification_sent_at = new Date(Date.now() - 120000)
		h.state.users.push({ id: 9, email: 'v@gmail.com', username: 'taken_nm', email_verified: true })
		await expect(reg('taken_nm', 'a@gmail.com')).rejects.toMatchObject({ statusCode: 400 })
		await reg('fresh_nm', 'a@gmail.com')
		expect(h.state.users[0].username).toBeNull()
		expect(readPendingUsername(h.state.users[0].verification_token)).toBe('fresh_nm')
	})

	it('resend keeps the pending username', async () => {
		await reg('zarrin_1', 'a@gmail.com')
		h.state.users[0].last_verification_sent_at = new Date(Date.now() - 120000)
		const old = h.state.users[0].verification_token
		h.state.body = { email: 'a@gmail.com' }
		await resendHandler({} as any)
		expect(h.state.users[0].verification_token).not.toBe(old)
		expect(readPendingUsername(h.state.users[0].verification_token)).toBe('zarrin_1')
	})
})
