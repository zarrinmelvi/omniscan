// Password max length (30): UI source checks + server rejection tests.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const h = vi.hoisted(() => {
	process.env.JWT_SECRET = 'test-secret'
	return { state: { body: {} as any } }
})

vi.mock('../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(async () => null) } } }))
vi.mock('../utils/requireAuth', () => ({ requireAuth: () => ({ id: 1 }) }))
vi.mock('../utils/email', () => ({
	generateVerificationToken: () => 't',
	sendVerificationEmail: vi.fn(async () => ({ success: true })),
	isAllowedEmailDomain: () => true,
}))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(), hash: vi.fn() } }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('h3', async (orig) => {
	const actual: any = await orig()
	return { ...actual, readBody: vi.fn(async () => h.state.body) }
})

import registerHandler from '../api/auth/register.post'
import resetHandler from '../api/auth/reset-password.post'
import changeHandler from '../api/users/password.put'

const UI = resolve(__dirname, '../../../omniscan-ui/src/views')
const API = resolve(__dirname, '../api')
const read = (p: string) => readFileSync(p, 'utf-8')

/** Returns the opening <input ...> tag containing the given v-model. */
function inputTag(src: string, model: string): string {
	const i = src.indexOf(`v-model="${model}"`)
	expect(i).toBeGreaterThan(-1)
	const start = src.lastIndexOf('<input', i)
	return src.slice(start, src.indexOf('/>', i))
}

const STRONG_31 = 'Aa1!' + 'x'.repeat(27)
const MSG = 'Password must be 30 characters or fewer.'

describe('password inputs', () => {
	const cases: Array<[string, string[]]> = [
		['RegisterPage.vue', ['password', 'confirmPassword']],
		['LoginPage.vue', ['password']],
		['ResetPasswordPage.vue', ['password', 'confirmPassword']],
		['ProfilePage.vue', ['newPassword', 'confirmNewPassword']],
	]
	for (const [file, models] of cases) {
		it(`${file} has maxlength="30" and has-toggle`, () => {
			const src = read(resolve(UI, file))
			for (const m of models) {
				const tag = inputTag(src, m)
				expect(tag).toContain('maxlength="30"')
				expect(tag).toContain('has-toggle')
			}
			expect(src).toContain('.custom-input.has-toggle { padding-right: 44px; }')
		})
	}

	it('Profile currentPassword has no maxlength', () => {
		expect(inputTag(read(resolve(UI, 'ProfilePage.vue')), 'currentPassword')).not.toContain('maxlength')
	})

	it('Gender and Birthday share one name-row block', () => {
		const src = read(resolve(UI, 'RegisterPage.vue'))
		const start = src.indexOf('<div class="name-row margin-top">')
		expect(start).toBeGreaterThan(-1)
		const g = src.indexOf('v-model="gender"', start)
		const b = src.indexOf('v-model="birthday"', start)
		const email = src.indexOf('Email Address', start)
		expect(g).toBeGreaterThan(start)
		expect(b).toBeGreaterThan(g)
		expect(b).toBeLessThan(email)
		const block = src.slice(start, email)
		expect(block.match(/<div/g)!.length).toBe(block.match(/<\/div>/g)!.length + 1) // name-row still open before the Email group
	})
})

describe('server rejects passwords over 30 chars', () => {
	it('register.post', async () => {
		h.state.body = {
			first_name: 'A', last_name: 'B', username: 'abcd', email: 'a@gmail.com',
			password: STRONG_31, gender: 'Male', birthday: '1990-01-01',
		}
		await expect(registerHandler({} as any)).rejects.toMatchObject({ statusCode: 400, statusMessage: MSG })
	})

	it('reset-password.post', async () => {
		h.state.body = { token: 'tok', password: STRONG_31 }
		await expect(resetHandler({} as any)).rejects.toMatchObject({ statusCode: 400, statusMessage: MSG })
	})

	it('users/password.put', async () => {
		h.state.body = { current_password: 'Old1!aaa', new_password: STRONG_31 }
		await expect(changeHandler({} as any)).rejects.toMatchObject({ statusCode: 400, statusMessage: MSG })
	})

	it('login.post has no 30-character check', () => {
		const src = read(resolve(API, 'auth/login.post.ts'))
		expect(src).not.toMatch(/length\s*>\s*30/)
		expect(src).not.toContain('30 characters')
	})
})
