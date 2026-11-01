/**
 * Feature C — Halal Logo Library lifecycle.
 *
 * This is the ONLY place in the backend that makes an outbound HTTP request
 * to fetch a certifier's logo. It runs exclusively on explicit admin action
 * (create-with-direct-link, or re-scrape) — never on a scan or public request.
 *
 * The downloaded image is returned as a base64 data URI so it can be stored
 * directly in the database (no file-storage infra).
 */

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB cap
const TIMEOUT_MS = 10_000

export type FetchLogoResult =
	| { ok: true; dataUri: string }
	| { ok: false; error: string }

export async function fetchLogoAsBase64(url: string): Promise<FetchLogoResult> {
	const trimmed = (url ?? '').trim()
	const lower = trimmed.toLowerCase()
	if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
		return { ok: false, error: 'URL must use http or https' }
	}

	// Upgrade http:// → https:// before the outbound request.
	const requestUrl = lower.startsWith('http://') ? 'https://' + trimmed.slice(7) : trimmed

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

	try {
		const res = await fetch(requestUrl, { signal: controller.signal, redirect: 'follow' })

		if (!res.ok) {
			return { ok: false, error: `Network error: server returned HTTP ${res.status}` }
		}

		const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
		if (!contentType.startsWith('image/')) {
			return { ok: false, error: 'Non-image content type: URL did not return an image' }
		}

		const buf = await res.arrayBuffer()
		if (buf.byteLength > MAX_BYTES) {
			return { ok: false, error: 'Oversized file: image exceeds the 2 MB download limit' }
		}

		const b64 = Buffer.from(buf).toString('base64')
		return { ok: true, dataUri: `data:${contentType};base64,${b64}` }
	} catch (err) {
		if (controller.signal.aborted) {
			return { ok: false, error: 'Timeout: download exceeded the 10-second limit' }
		}
		return {
			ok: false,
			error: 'Network error: could not reach the server. The link may have changed or the site may be down.',
		}
	} finally {
		clearTimeout(timeout)
	}
}
