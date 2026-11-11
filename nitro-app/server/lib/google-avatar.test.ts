import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchGoogleAvatarAsDataUri, isAllowedGoogleAvatarUrl, withAvatarSize } from './google-avatar'

const GOOD_URL = 'https://lh3.googleusercontent.com/a/abc123=s96-c'

function mockFetch(body: Uint8Array, init: { ok?: boolean; type?: string; length?: string } = {}) {
	const headers = new Headers()
	if (init.type !== '') headers.set('content-type', init.type ?? 'image/jpeg')
	if (init.length) headers.set('content-length', init.length)
	const res = { ok: init.ok ?? true, headers, arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) }
	const fn = vi.fn().mockResolvedValue(res)
	vi.stubGlobal('fetch', fn)
	return fn
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('isAllowedGoogleAvatarUrl', () => {
	it('accepts https googleusercontent hosts', () => {
		expect(isAllowedGoogleAvatarUrl(GOOD_URL)).toBe(true)
		expect(isAllowedGoogleAvatarUrl('https://googleusercontent.com/x')).toBe(true)
	})

	it('rejects other hosts, look-alikes, http and junk', () => {
		expect(isAllowedGoogleAvatarUrl('https://evil.com/a.jpg')).toBe(false)
		expect(isAllowedGoogleAvatarUrl('https://googleusercontent.com.evil.com/a.jpg')).toBe(false)
		expect(isAllowedGoogleAvatarUrl('https://notgoogleusercontent.com/a.jpg')).toBe(false)
		expect(isAllowedGoogleAvatarUrl('http://lh3.googleusercontent.com/a.jpg')).toBe(false)
		expect(isAllowedGoogleAvatarUrl('not a url')).toBe(false)
		expect(isAllowedGoogleAvatarUrl(undefined)).toBe(false)
	})
})

describe('withAvatarSize', () => {
	it('rewrites an existing size suffix', () => {
		expect(withAvatarSize('https://lh3.googleusercontent.com/a/abc=s96-c')).toBe('https://lh3.googleusercontent.com/a/abc=s256-c')
	})

	it('appends a size when none is present', () => {
		expect(withAvatarSize('https://lh3.googleusercontent.com/a/abc')).toBe('https://lh3.googleusercontent.com/a/abc=s256-c')
	})
})

describe('fetchGoogleAvatarAsDataUri', () => {
	it('returns a data URI for a valid image', async () => {
		const fetchSpy = mockFetch(new Uint8Array([1, 2, 3, 4]))
		const result = await fetchGoogleAvatarAsDataUri(GOOD_URL)
		expect(result).toBe(`data:image/jpeg;base64,${Buffer.from([1, 2, 3, 4]).toString('base64')}`)
		expect(fetchSpy.mock.calls[0][0]).toContain('=s256-c')
	})

	it('does not fetch for a disallowed host', async () => {
		const fetchSpy = mockFetch(new Uint8Array([1]))
		expect(await fetchGoogleAvatarAsDataUri('https://evil.com/a.jpg')).toBeNull()
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it('returns null for a non-image response', async () => {
		mockFetch(new Uint8Array([1]), { type: 'text/html' })
		expect(await fetchGoogleAvatarAsDataUri(GOOD_URL)).toBeNull()
	})

	it('returns null when the declared size is too large', async () => {
		mockFetch(new Uint8Array([1]), { length: String(10 * 1024 * 1024) })
		expect(await fetchGoogleAvatarAsDataUri(GOOD_URL)).toBeNull()
	})

	it('returns null when the body is larger than the cap', async () => {
		mockFetch(new Uint8Array(600 * 1024))
		expect(await fetchGoogleAvatarAsDataUri(GOOD_URL)).toBeNull()
	})

	it('returns null for a failed response', async () => {
		mockFetch(new Uint8Array([1]), { ok: false })
		expect(await fetchGoogleAvatarAsDataUri(GOOD_URL)).toBeNull()
	})

	it('returns null instead of throwing when fetch rejects', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
		expect(await fetchGoogleAvatarAsDataUri(GOOD_URL)).toBeNull()
	})
})
