/**
 * Download a Google profile picture and return it as a `data:` URI so it can be
 * stored in `User.avatar_base64` and rendered by the existing UI.
 *
 * Safety rules:
 *  - https only, host must be a googleusercontent.com host (prevents SSRF via a forged URL)
 *  - 5s timeout, 500KB size cap, response must be image/*
 *  - never throws: any failure returns null so sign-in / registration is never blocked
 */

const FETCH_TIMEOUT_MS = 5000
const MAX_AVATAR_BYTES = 500 * 1024
const AVATAR_SIZE_PX = 256

export function isAllowedGoogleAvatarUrl(raw: unknown): raw is string {
	if (typeof raw !== 'string' || !raw) return false
	let url: URL
	try {
		url = new URL(raw)
	} catch {
		return false
	}
	if (url.protocol !== 'https:') return false
	const host = url.hostname.toLowerCase()
	return host === 'googleusercontent.com' || host.endsWith('.googleusercontent.com')
}

/** Ask Google for a ~256px version instead of the default tiny one. */
export function withAvatarSize(rawUrl: string): string {
	if (/=s\d+(-c)?$/.test(rawUrl)) {
		return rawUrl.replace(/=s\d+(-c)?$/, `=s${AVATAR_SIZE_PX}-c`)
	}
	if (rawUrl.includes('=')) return rawUrl
	return `${rawUrl}=s${AVATAR_SIZE_PX}-c`
}

export async function fetchGoogleAvatarAsDataUri(pictureUrl: unknown): Promise<string | null> {
	if (!isAllowedGoogleAvatarUrl(pictureUrl)) return null

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

	try {
		const res = await fetch(withAvatarSize(pictureUrl), { signal: controller.signal, redirect: 'error' })
		if (!res.ok) return null

		const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
		if (!contentType.startsWith('image/')) return null

		const declaredLength = Number(res.headers.get('content-length'))
		if (Number.isFinite(declaredLength) && declaredLength > MAX_AVATAR_BYTES) return null

		const buffer = Buffer.from(await res.arrayBuffer())
		if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) return null

		return `data:${contentType};base64,${buffer.toString('base64')}`
	} catch {
		return null
	} finally {
		clearTimeout(timer)
	}
}
