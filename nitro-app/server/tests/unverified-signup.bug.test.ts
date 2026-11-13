// Bug condition exploration (register): the username must NOT be saved on the
// unverified row, and a pending username must not block another registration.
// EXPECTED TO FAIL on unfixed code.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	return { state: { body: {} as any, users: [] as any[] } }
})

vi.mock('../lib/prisma', () => {
	const match = (u: any, where: any) => Object.entries(where).every(([k, v]) => u[k] === v)
	const user = {
		findUnique: vi.fn(async ({ where }: any) => h.state.users.find((u) => match(u, where)) ?? null),
		update: vi.fn(async ({ where, data }: any) => {
			const u = h.state.users.find((x) => match(x, where))
			Object.assign(u, data)
			return u
		}),
		create: vi.fn(async ({ data }: any) => {
			const row = { id: h.state.users.length + 1, ...data }
			if (row.username != null && h.state.users.some((u) => u.username === row.username)) {
				throw Object.assign(new Error('unique'), { code: 'P2002' })
			}
			h.state.users.push(row)
			return row
		}),
	}
	const tx = { user, dietaryProfile: { create: vi.fn(async () => ({})) } }
	return { prisma: { user, $transaction: async (cb: any) => cb(tx) } }
})
vi.mock('../utils/email', () => ({
	generateVerificationToken: () => 'plain-token-' + Math.random(),
	sendVerificationEmail: vi.fn(async () => ({ success: true })),
	isAllowedEmailDomain: () => true,
}))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(), hash: vi.fn(async () => 'hashed') } }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import registerHandler from '../api/auth/register.post'

const base = {
	first_name: 'Zar', last_name: 'Rin', password: 'Passw0rd!', gender: 'Male', birthday: '1990-01-01',
}

beforeEach(() => {
	h.state.users = []
})

describe('Bug condition: unverified registration reserves username', () => {
	it('stores username === null on the created unverified row', async () => {
		h.state.body = { ...base, username: 'zarrin_1', email: 'a@gmail.com' }
		await registerHandler({} as any)
		expect(h.state.users).toHaveLength(1)
		expect(h.state.users[0].email_verified).toBe(false)
		expect(h.state.users[0].username).toBeNull()
	})

	it('accepts a second registration of the same username while the first is unverified', async () => {
		h.state.body = { ...base, username: 'zarrin_1', email: 'a@gmail.com' }
		await registerHandler({} as any)
		h.state.body = { ...base, username: 'zarrin_1', email: 'b@gmail.com' }
		await expect(registerHandler({} as any)).resolves.toMatchObject({ requiresVerification: true, email: 'b@gmail.com' })
		expect(h.state.users).toHaveLength(2)
	})
})
