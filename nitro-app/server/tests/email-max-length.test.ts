// Email max length (31) on sign up: UI source check + server rejection tests.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import fc from 'fast-check'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	return { state: { body: {} as any } }
})

vi.mock('../lib/prisma', () => ({
	prisma: {
		user: { findUnique: vi.fn(async () => null) },
		$transaction: vi.fn(async () => undefined),
	},
}))
vi.mock('../utils/email', () => ({
	generateVerificationToken: () => 't',
	sendVerificationEmail: vi.fn(async () => ({ success: true })),
	isAllowedEmailDomain: () => true,
}))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(), hash: vi.fn(async () => 'h') } }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import registerHandler from '../api/auth/register.post'

const MSG = 'Email must be 31 characters or less.'
const emailOfLength = (n: number) => 'a'.repeat(n - '@gmail.com'.length) + '@gmail.com'
const bodyWith = (email: string) => ({
	first_name: 'A', last_name: 'B', username: 'abcd', email,
	password: 'Aa1!xxxx', gender: 'Male', birthday: '1990-01-01',
})

describe('email max length on register', () => {
	it('accepts a 31-character email', async () => {
		h.state.body = bodyWith(emailOfLength(31))
		await expect(registerHandler({} as any)).resolves.toMatchObject({ requiresVerification: true })
	})

	it('rejects a 32-character email with 400', async () => {
		h.state.body = bodyWith(emailOfLength(32))
		await expect(registerHandler({} as any)).rejects.toMatchObject({ statusCode: 400, statusMessage: MSG })
	})

	it('property: length > 31 rejected, <= 31 accepted', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 11, max: 80 }), async (n) => {
				h.state.body = bodyWith(emailOfLength(n))
				if (n > 31) {
					await expect(registerHandler({} as any)).rejects.toMatchObject({ statusCode: 400, statusMessage: MSG })
				} else {
					await expect(registerHandler({} as any)).resolves.toBeDefined()
				}
			}),
			{ numRuns: 50 },
		)
	})
})

describe('RegisterPage email input', () => {
	it('has maxlength="31"', () => {
		const src = readFileSync(resolve(__dirname, '../../../omniscan-ui/src/views/RegisterPage.vue'), 'utf-8')
		const i = src.indexOf('v-model="email"')
		expect(i).toBeGreaterThan(-1)
		const tag = src.slice(src.lastIndexOf('<input', i), src.indexOf('/>', i))
		expect(tag).toContain('maxlength="31"')
	})

	it('LoginPage email input has no maxlength', () => {
		const src = readFileSync(resolve(__dirname, '../../../omniscan-ui/src/views/LoginPage.vue'), 'utf-8')
		const i = src.indexOf('v-model="email"')
		if (i > -1) {
			const tag = src.slice(src.lastIndexOf('<input', i), src.indexOf('/>', i))
			expect(tag).not.toContain('maxlength')
		}
	})
})
