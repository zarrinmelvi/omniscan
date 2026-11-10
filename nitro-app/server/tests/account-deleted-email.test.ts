import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('resend', () => ({
	Resend: class {
		emails = { send: h.send }
	},
}))
vi.mock('../lib/prisma', () => ({ prisma: {} }))
vi.mock('../lib/admin-settings', () => ({ getAdminSettings: vi.fn(async () => ({})) }))

import { sendAccountDeletedEmail } from '../utils/email'

describe('sendAccountDeletedEmail', () => {
	beforeEach(() => {
		h.send.mockReset()
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(console, 'log').mockImplementation(() => {})
	})

	it('sends the deletion email with a sign-up link and returns success', async () => {
		h.send.mockResolvedValue({ error: null })
		const result = await sendAccountDeletedEmail('user@gmail.com', 'Ada')
		expect(result).toEqual({ success: true })
		expect(h.send).toHaveBeenCalledTimes(1)
		const arg = h.send.mock.calls[0][0]
		expect(arg.to).toBe('user@gmail.com')
		expect(arg.subject.toLowerCase()).toContain('deleted')
		expect(arg.html).toContain('Ada')
		expect(arg.html).toContain('/register')
	})

	it('returns failure when Resend returns an error', async () => {
		h.send.mockResolvedValue({ error: { message: 'rate limited' } })
		const result = await sendAccountDeletedEmail('user@gmail.com', 'Ada')
		expect(result).toEqual({ success: false, error: 'rate limited' })
	})

	it('returns failure and does not throw when Resend throws', async () => {
		h.send.mockRejectedValue(new Error('network down'))
		const result = await sendAccountDeletedEmail('user@gmail.com', 'Ada')
		expect(result).toEqual({ success: false, error: 'network down' })
	})
})
