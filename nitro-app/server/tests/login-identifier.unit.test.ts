// Unit + property tests for the username/identifier login fix (task 3.7).
//
// Validates: Requirements 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	const state: any = { users: [] as any[], body: {} as any, calls: [] as any[] }

	const matchVal = (rowVal: any, cond: any): boolean => {
		const v = rowVal === undefined ? null : rowVal
		if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
			if ('equals' in cond) {
				if (typeof v !== 'string') return false
				return cond.mode === 'insensitive' ? v.toLowerCase() === String(cond.equals).toLowerCase() : v === cond.equals
			}
			return true
		}
		return v === cond
	}
	const match = (row: any, where: any = {}) => Object.entries(where).every(([k, c]) => matchVal(row[k], c))

	const prisma: any = {
		user: {
			findUnique: async (args: any) => {
				state.calls.push({ fn: 'findUnique', args })
				const r = state.users.find((u: any) => match(u, args.where))
				return r ? { ...r } : null
			},
			findMany: async (args: any) => {
				state.calls.push({ fn: 'findMany', args })
				return state.users
					.filter((u: any) => match(u, args.where))
					.slice(0, args.take ?? 1000)
					.map((u: any) => ({ ...u }))
			},
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
		// Valid only when the stored hash is exactly `hashed:<password>`; throws on null like real bcrypt.
		compare: vi.fn(async (pw: any, hash: any) => {
			if (hash === null || hash === undefined) throw new Error('data and hash arguments required')
			return hash === `hashed:${pw}`
		}),
	},
}))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(() => 'signed-token'), verify: vi.fn() } }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import bcrypt from 'bcrypt'
import loginHandler from '../api/auth/login.post'

const compare = (bcrypt as any).compare as ReturnType<typeof vi.fn>
const fakeEvent = () => ({ node: { req: { headers: {}, url: '/' }, res: {} } }) as any

const makeUser = (over: any = {}) => ({
	id: 1,
	name: 'Juan Dela',
	email: 'juan@gmail.com',
	username: 'juan_dela',
	password: 'hashed:pw',
	email_verified: true,
	avatar_base64: null,
	status: 'ACTIVE',
	...over,
})

const run = async (): Promise<any> => {
	try {
		return { ok: true, value: await (loginHandler as any)(fakeEvent()) }
	} catch (e: any) {
		return { ok: false, status: e.statusCode, message: e.statusMessage, data: e.data }
	}
}

const reset = () => {
	h.state.users = [makeUser()]
	h.state.body = {}
	h.state.calls = []
	compare.mockClear()
}
beforeEach(reset)

const GENERIC = 'Invalid username/email or password.'

describe('identifier / email field handling', () => {
	it('identifier is preferred over email', async () => {
		h.state.users = [makeUser(), makeUser({ id: 2, email: 'other@gmail.com', username: 'other' })]
		h.state.body = { identifier: 'juan_dela', email: 'other@gmail.com', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(true)
		expect(r.value.user.id).toBe(1)
	})

	it('legacy email-only body still signs in', async () => {
		h.state.body = { email: 'juan@gmail.com', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(true)
		expect(r.value.user.email).toBe('juan@gmail.com')
		expect(r.value.message).toBe('Login successful')
	})

	it('trims the identifier', async () => {
		h.state.body = { identifier: '  juan_dela  ', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(true)
		expect(h.state.calls[0].args.where.username.equals).toBe('juan_dela')
	})

	it('a present non-string identifier is invalid and does not fall back to email', async () => {
		h.state.body = { identifier: 123, email: 'juan@gmail.com', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(false)
		expect(r.status).toBe(400)
		expect(r.message).toBe('Username or email is required.')
	})
})

describe('lookup routing', () => {
	it('email identifier uses findUnique only', async () => {
		h.state.body = { identifier: 'juan@gmail.com', password: 'pw' }
		await run()
		expect(h.state.calls.map((c: any) => c.fn)).toEqual(['findUnique'])
		expect(h.state.calls[0].args.where).toEqual({ email: 'juan@gmail.com' })
	})

	it('username identifier uses findMany with insensitive equals and take 5', async () => {
		h.state.body = { identifier: 'juan_dela', password: 'pw' }
		await run()
		expect(h.state.calls.map((c: any) => c.fn)).toEqual(['findMany'])
		expect(h.state.calls[0].args.where).toEqual({ username: { equals: 'juan_dela', mode: 'insensitive' } })
		expect(h.state.calls[0].args.take).toBe(5)
	})
})

describe('username case rules', () => {
	it('Juan_Dela matches stored juan_dela', async () => {
		h.state.body = { identifier: 'Juan_Dela', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(true)
		expect(r.value.user.id).toBe(1)
	})

	it('exact-case match is preferred over a case-insensitive one', async () => {
		h.state.users = [makeUser({ id: 2, username: 'Juan_Dela', email: 'b@gmail.com' }), makeUser({ id: 1 })]
		h.state.body = { identifier: 'juan_dela', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(true)
		expect(r.value.user.id).toBe(1)
	})

	it('two non-exact matches give 401', async () => {
		h.state.users = [makeUser({ id: 1, username: 'Juan' }), makeUser({ id: 2, username: 'JUAN', email: 'b@gmail.com' })]
		h.state.body = { identifier: 'juan', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(false)
		expect(r.status).toBe(401)
		expect(r.message).toBe(GENERIC)
	})
})

describe('validation', () => {
	it.each([
		['missing identifier and email', { password: 'pw' }],
		['empty identifier', { identifier: '', password: 'pw' }],
		['whitespace identifier', { identifier: '   ', password: 'pw' }],
		['non-string email', { email: 42, password: 'pw' }],
	])('400 "Username or email is required." for %s', async (_n, body) => {
		h.state.body = body
		const r = await run()
		expect(r.status).toBe(400)
		expect(r.message).toBe('Username or email is required.')
	})

	it('400 "Password is required." when password is missing', async () => {
		h.state.body = { identifier: 'juan_dela' }
		const r = await run()
		expect(r.status).toBe(400)
		expect(r.message).toBe('Password is required.')
	})
})

describe('generic 401 and constant-time compare', () => {
	it('unknown username -> 401, compare called once', async () => {
		h.state.body = { identifier: 'nobody', password: 'pw' }
		const r = await run()
		expect(r.status).toBe(401)
		expect(r.message).toBe(GENERIC)
		expect(compare).toHaveBeenCalledTimes(1)
	})

	it('unknown email -> 401, compare called once', async () => {
		h.state.body = { identifier: 'nobody@gmail.com', password: 'pw' }
		const r = await run()
		expect(r.status).toBe(401)
		expect(r.message).toBe(GENERIC)
		expect(compare).toHaveBeenCalledTimes(1)
	})

	it('wrong password -> 401, compare called once', async () => {
		h.state.body = { identifier: 'juan_dela', password: 'wrong' }
		const r = await run()
		expect(r.status).toBe(401)
		expect(r.message).toBe(GENERIC)
		expect(compare).toHaveBeenCalledTimes(1)
	})

	it('null-password account -> 401 (not 500), compare called once', async () => {
		h.state.users = [makeUser({ password: null })]
		h.state.body = { identifier: 'juan_dela', password: 'pw' }
		const r = await run()
		expect(r.status).toBe(401)
		expect(r.message).toBe(GENERIC)
		expect(compare).toHaveBeenCalledTimes(1)
	})

	it('successful login calls compare once', async () => {
		h.state.body = { identifier: 'juan_dela', password: 'pw' }
		const r = await run()
		expect(r.ok).toBe(true)
		expect(compare).toHaveBeenCalledTimes(1)
	})
})

describe('unverified account', () => {
	it('403 carries data.email for a username login', async () => {
		h.state.users = [makeUser({ email_verified: false })]
		h.state.body = { identifier: 'juan_dela', password: 'pw' }
		const r = await run()
		expect(r.status).toBe(403)
		expect(r.data).toMatchObject({ requiresVerification: true, email: 'juan@gmail.com' })
	})

	it('wrong password on unverified account is still 401', async () => {
		h.state.users = [makeUser({ email_verified: false })]
		h.state.body = { identifier: 'juan_dela', password: 'wrong' }
		const r = await run()
		expect(r.status).toBe(401)
	})
})

describe('properties', () => {
	it('any case permutation of the stored username signs in the same account', async () => {
		await fc.assert(
			fc.asyncProperty(fc.array(fc.boolean(), { minLength: 9, maxLength: 9 }), async (flags) => {
				reset()
				const ident = [...'juan_dela'].map((ch, i) => (flags[i] ? ch.toUpperCase() : ch)).join('')
				h.state.body = { identifier: ident, password: 'pw' }
				const r = await run()
				expect(r.ok).toBe(true)
				expect(r.value.user.id).toBe(1)
			}),
			{ numRuns: 50 },
		)
	})

	it('"@" identifiers only hit the email lookup, others only the username lookup', async () => {
		await fc.assert(
			fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (s) => {
				reset()
				h.state.body = { identifier: s, password: 'pw' }
				await run()
				const trimmed = s.trim()
				if (trimmed === '') {
					expect(h.state.calls).toHaveLength(0)
					return
				}
				const fns = h.state.calls.map((c: any) => c.fn)
				expect(fns).toEqual([trimmed.includes('@') ? 'findUnique' : 'findMany'])
			}),
			{ numRuns: 100 },
		)
	})

	it('random or malformed bodies never produce a 500', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.oneof(
					fc.constant(null),
					fc.anything(),
					fc.record(
						{ identifier: fc.anything(), email: fc.anything(), password: fc.anything() },
						{ requiredKeys: [] },
					),
				),
				async (body) => {
					reset()
					h.state.body = body
					const r = await run()
					if (!r.ok) expect(r.status).not.toBe(500)
				},
			),
			{ numRuns: 150 },
		)
	})
})
