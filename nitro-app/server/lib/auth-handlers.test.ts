/**
 * Handler-level tests for the forgot / reset password endpoints.
 * Prisma, email sending and h3's readBody are mocked; JWT and bcrypt are real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const prismaMock = vi.hoisted(() => ({
	user: { findUnique: vi.fn(), update: vi.fn() },
}))
const sendEmailMock = vi.hoisted(() => vi.fn())
const readBodyMock = vi.hoisted(() => vi.fn())

vi.mock('./prisma', () => ({ prisma: prismaMock }))
vi.mock('../utils/email', () => ({ sendPasswordResetEmail: sendEmailMock }))
vi.mock('h3', async (importOriginal) => {
	const actual = await importOriginal<typeof import('h3')>()
	return { ...actual, readBody: readBodyMock, eventHandler: (fn: unknown) => fn }
})

import forgotPassword from '../api/auth/forgot-password.post'
import resetPassword from '../api/auth/reset-password.post'
import { passwordFingerprint } from './password-reset'

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret'
const call = (handler: unknown) => (handler as (e: unknown) => Promise<any>)({})

async function expectError(promise: Promise<unknown>, statusCode: number, messagePart?: string) {
	try {
		await promise
	} catch (err: any) {
		expect(err.statusCode).toBe(statusCode)
		if (messagePart) expect(err.statusMessage).toContain(messagePart)
		return
	}
	throw new Error('Expected the handler to throw')
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('POST /api/auth/forgot-password', () => {
	const user = { id: 1, name: 'Ana', email: 'ana@gmail.com', password: 'hash', password_reset_requested_at: null }

	it('rejects a malformed email with 400', async () => {
		readBodyMock.mockResolvedValue({ email: 'not-an-email' })
		await expectError(call(forgotPassword), 400)
	})

	it('returns the exact not-registered message with 404', async () => {
		readBodyMock.mockResolvedValue({ email: 'nobody@gmail.com' })
		prismaMock.user.findUnique.mockResolvedValue(null)
		await expectError(
			call(forgotPassword),
			404,
			'Account of that email does not exists. Input an email that has existing account.'
		)
		expect(sendEmailMock).not.toHaveBeenCalled()
	})

	it('also reports not-registered for emails on other domains', async () => {
		readBodyMock.mockResolvedValue({ email: 'someone@school.edu' })
		prismaMock.user.findUnique.mockResolvedValue(null)
		await expectError(call(forgotPassword), 404, 'Account of that email does not exists')
	})

	it('sends the email, records the time and returns the exact success message', async () => {
		readBodyMock.mockResolvedValue({ email: 'ANA@gmail.com' })
		prismaMock.user.findUnique.mockResolvedValue(user)
		sendEmailMock.mockResolvedValue({ success: true })

		const res = await call(forgotPassword)
		expect(res).toEqual({ success: true, message: 'A password reset link has been sent.' })
		expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toBe('ana@gmail.com')

		const token = sendEmailMock.mock.calls[0][2]
		const payload = jwt.verify(token, JWT_SECRET) as any
		expect(payload.type).toBe('password_reset')
		expect(payload.pwf).toBe(passwordFingerprint('hash'))
		expect(prismaMock.user.update).toHaveBeenCalledTimes(1)
	})

	it('returns 429 with the seconds left inside the 30s cooldown', async () => {
		readBodyMock.mockResolvedValue({ email: 'ana@gmail.com' })
		prismaMock.user.findUnique.mockResolvedValue({ ...user, password_reset_requested_at: new Date(Date.now() - 5_000) })
		await expectError(call(forgotPassword), 429, 'Please wait')
		expect(sendEmailMock).not.toHaveBeenCalled()
	})

	it('errors and does not record the time when the email fails to send', async () => {
		readBodyMock.mockResolvedValue({ email: 'ana@gmail.com' })
		prismaMock.user.findUnique.mockResolvedValue(user)
		sendEmailMock.mockResolvedValue({ success: false, error: 'boom' })
		await expectError(call(forgotPassword), 500, 'Unable to send')
		expect(prismaMock.user.update).not.toHaveBeenCalled()
	})
})

describe('POST /api/auth/reset-password', () => {
	const oldPassword = 'OldPass1!'
	let oldHash: string

	const makeToken = (pwf: string | undefined, extra: Record<string, unknown> = {}) =>
		jwt.sign({ userId: 1, email: 'ana@gmail.com', type: 'password_reset', ...(pwf !== undefined ? { pwf } : {}), ...extra }, JWT_SECRET, {
			expiresIn: '30m',
		})

	beforeEach(async () => {
		oldHash = await bcrypt.hash(oldPassword, 4)
		prismaMock.user.findUnique.mockResolvedValue({ id: 1, password: oldHash })
	})

	it('rejects a new password that matches the current one', async () => {
		readBodyMock.mockResolvedValue({ token: makeToken(passwordFingerprint(oldHash)), password: oldPassword })
		await expectError(
			call(resetPassword),
			400,
			'The new password cannot be the same as your previous password.'
		)
		expect(prismaMock.user.update).not.toHaveBeenCalled()
	})

	it('rejects a weak password before anything else', async () => {
		readBodyMock.mockResolvedValue({ token: makeToken(passwordFingerprint(oldHash)), password: 'weak' })
		await expectError(call(resetPassword), 400, 'Password must be at least 8 characters')
	})

	it('rejects a link whose password has since changed (already used)', async () => {
		readBodyMock.mockResolvedValue({ token: makeToken(passwordFingerprint('some-older-hash')), password: 'NewPass1!' })
		await expectError(call(resetPassword), 400, 'invalid, expired, or has already been used')
		expect(prismaMock.user.update).not.toHaveBeenCalled()
	})

	it('rejects old-style tokens that have no pwf claim', async () => {
		readBodyMock.mockResolvedValue({ token: makeToken(undefined), password: 'NewPass1!' })
		await expectError(call(resetPassword), 400, 'invalid, expired, or has already been used')
	})

	it('updates the password and returns "Update successfully"', async () => {
		readBodyMock.mockResolvedValue({ token: makeToken(passwordFingerprint(oldHash)), password: 'NewPass1!' })
		prismaMock.user.update.mockResolvedValue({})

		const res = await call(resetPassword)
		expect(res).toEqual({ success: true, message: 'Update successfully' })

		const saved = prismaMock.user.update.mock.calls[0][0].data.password
		expect(await bcrypt.compare('NewPass1!', saved)).toBe(true)
	})

	it('lets a Google-only account (no password) set one', async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: 1, password: null })
		readBodyMock.mockResolvedValue({ token: makeToken(passwordFingerprint(null)), password: 'NewPass1!' })
		prismaMock.user.update.mockResolvedValue({})
		const res = await call(resetPassword)
		expect(res.success).toBe(true)
	})
})
