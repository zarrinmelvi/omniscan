import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('oauth frontend URL defaults', () => {
	const original = process.env.FRONTEND_URL

	beforeEach(() => {
		vi.resetModules()
	})
	afterEach(() => {
		if (original === undefined) delete process.env.FRONTEND_URL
		else process.env.FRONTEND_URL = original
	})

	it('defaults to https://omniscan.website when FRONTEND_URL is unset', async () => {
		delete process.env.FRONTEND_URL
		const oauth = await import('./oauth')
		expect(oauth.FRONTEND_URL).toBe('https://omniscan.website')
		expect(oauth.OAUTH_FRONTEND_SUCCESS).toBe('https://omniscan.website/tabs/home')
		expect(oauth.OAUTH_FRONTEND_FAILURE).toBe('https://omniscan.website/login')
	})

	it('respects the FRONTEND_URL env var', async () => {
		process.env.FRONTEND_URL = 'https://example.test/'
		const oauth = await import('./oauth')
		expect(oauth.OAUTH_FRONTEND_SUCCESS).toBe('https://example.test/tabs/home')
	})
})
