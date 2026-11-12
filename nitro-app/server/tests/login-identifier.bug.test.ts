// Bug condition exploration tests (Property 1) for username/identifier login.
// They encode the EXPECTED behavior and are meant to FAIL on unfixed code.
//
// Validates: Requirements 1.3, 1.4, 1.5, 2.6, 2.7, 2.8, 2.10

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	const state: any = { users: [] as any[], body: {} as any }

	const matchVal = (rowVal: any, cond: any): boolean => {
		const v = rowVal === undefined ? null : rowVal
		if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
			if ('equals' in cond) {
				return typeof v === 'string' && v.toLowerCase() === String(cond.equals).toLowerCase()
			}
			return true
		}
		return v === cond
	}
	const match = (row: any, where: any = {}) => Object.entries(where).every(([k, c]) => matchVal(row[k], c))

	const prisma: any = {
		user: {
			findUnique: async ({ where }: any) => {
				const r = state.users.find((u: any) => match(u, where))
				return r ? { ...r } : null
			},
			findMany: async ({ where, take }: any) =>
				state.users
					.filter((u: any) => match(u, where))
					.slice(0, take ?? 1000)
					.map((u: any) => ({ ...u })),
			update: async ({ where, data }: any) => {
				const r = state.users.find((u: any) => match(u, where))
				if (r) Object.assign(r, data)
				return r ? { ...r } : null
			},
			updateMany: async () => ({ count: 0 }),
		},
	}
	return { state, prisma }
})

vi.mock('../lib/prisma', () => ({ prisma: h.prisma }))
vi.mock('../lib/audit-logger', () => ({ logAuditEvent: vi.fn(async () => {}) }))
vi.mock('bcrypt', () => ({
	default: {
		// Mirrors real bcrypt: a null/undefined hash makes compare throw.
		compare: vi.fn(async (_pw: any, hash: any) => {
			if (hash === null || hash === undefined) throw new Error('data and hash arguments required')
			return true
		}),
	},
}))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(() => 'signed-token'), verify: vi.fn() } }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import loginHandler from '../api/auth/login.post'

const fakeEvent = () => ({ node: { req: { headers: {}, url: '/' }, res: {} } }) as any

const makeUser = (over: any = {}) => ({
	id: 1,
	name: 'Juan Dela',
	email: 'juan@gmail.com',
	username: 'juan_dela',
	password: 'hash',
	email_verified: true,
	avatar_base64: null,
	status: 'ACTIVE',
	...over,
})

const run = async () => {
	try {
		return { ok: true, value: await (loginHandler as any)(fakeEvent()) }
	} catch (e: any) {
		return { ok: false, status: e.statusCode, message: e.statusMessage }
	}
}

beforeEach(() => {
	h.state.users = [makeUser()]
	h.state.body = {}
})

describe('Property 1: username / identifier login', () => {
	it('Case A: { identifier: username } signs in', async () => {
		h.state.body = { identifier: 'juan_dela', password: 'pw' }
		const r: any = await run()
		expect(r.ok, `got ${r.status} "${r.message}"`).toBe(true)
		expect(r.value).toMatchObject({ token: 'signed-token', message: 'Login successful' })
		expect(r.value.user.id).toBe(1)
	})

	it('Case B: legacy { email: username } signs in', async () => {
		h.state.body = { email: 'juan_dela', password: 'pw' }
		const r: any = await run()
		expect(r.ok, `got ${r.status} "${r.message}"`).toBe(true)
		expect(r.value.user.id).toBe(1)
	})

	it('Case C: null-password (Google-only) account gets generic 401, not 500', async () => {
		h.state.users = [makeUser({ password: null })]
		h.state.body = { email: 'juan@gmail.com', password: 'pw' }
		const r: any = await run()
		expect(r.ok).toBe(false)
		expect(r.status).toBe(401)
		expect(r.message).toBe('Invalid username/email or password.')
	})
})

describe('Property 1: LoginPage source', () => {
	it('Case D: identifier input is type="text" with label "Username or email"', () => {
		const src = readFileSync(resolve(__dirname, '../../../omniscan-ui/src/views/LoginPage.vue'), 'utf-8')
		const input = src.match(/<input[^>]*v-model="email"[^>]*>/)?.[0] ?? ''
		expect(input).toContain('type="text"')
		expect(input).not.toContain('type="email"')
		expect(src).toContain('Username or email')
	})
})
