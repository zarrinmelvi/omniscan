import router from '@/router'

const TOKEN_KEY = 'omniscan_token'
const ADMIN_TOKEN_KEY = 'omniscan_admin_token'
const AUTH_EXEMPT_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/auth/resend-verification', '/api/admin/login']

// In local dev, this is left empty and Vite's dev-server proxy (vite.config.ts)
// forwards relative '/api/**' calls to http://localhost:3000 — nothing to
// configure. In production (Vercel), there's no such proxy: omniscan-ui is
// deployed as a separate static site from nitro-app, so a relative '/api/...'
// fetch would hit omniscan-ui's own domain instead of the backend. Set
// VITE_API_URL (e.g. to the nitro-app Vercel deployment's URL) in that
// project's Environment Variables to fix this — leave it unset locally.
export const API_BASE_URL = 'https://omniscan-ten.vercel.app'

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
	body?: unknown
	skipAuth?: boolean
	// True for calls to /api/admin/** — uses the separate admin token, and a
	// 401 logs out/redirects the ADMIN session, not the regular user session.
	// Admin and user auth are two completely independent logins (separate
	// tokens, separate stores) that can both be active in the same browser,
	// so this must never conflate the two.
	isAdmin?: boolean
}

export class ApiError extends Error {
	status: number
	data: unknown

	constructor(message: string, status: number, data: unknown) {
		super(message)
		this.name = 'ApiError'
		this.status = status
		this.data = data
	}
}

function isAuthExempt(endpoint: string, skipAuth?: boolean): boolean {
	if (skipAuth) return true
	return AUTH_EXEMPT_ENDPOINTS.some((exempt) => endpoint.startsWith(exempt))
}

function getToken(isAdmin?: boolean): string | null {
	// Bug 2 fix: admin token now lives in sessionStorage (cleared on tab close).
	// Consumer token remains in localStorage (intentional — persists across tabs).
	if (isAdmin) {
		return sessionStorage.getItem(ADMIN_TOKEN_KEY)
	}
	return localStorage.getItem(TOKEN_KEY)
}

async function parseJsonSafely(response: Response): Promise<unknown> {
	const text = await response.text()
	if (!text) return null
	try {
		return JSON.parse(text)
	} catch {
		return text
	}
}

// Branches on isAdmin so a 401 on an admin request only ever affects the
// admin session (logout + redirect to /admin/login), and a 401 on a regular
// user request only ever affects the user session (logout + redirect to
// /login) — never the other one.
//
// While a "signed in on another device" notice is being shown (see
// useSessionWatcher / useAdminSessionWatcher), the session is already cleared
// and the notice owns the redirect, so a racing 401 must not redirect too.
const sessionReplacedNotice = { consumer: false, admin: false }

export function setSessionReplacedNotice(role: 'consumer' | 'admin', active: boolean): void {
	sessionReplacedNotice[role] = active
}

// Watchers register their "signed in on another device" handlers here (avoids
// a circular import api.ts <-> watchers). Used by apiFetch on a
// `session_replaced` 401 so it follows the exact same flow as the SSE event.
type Role = 'consumer' | 'admin'
const sessionReplacedHandlers: Partial<Record<Role, () => void | Promise<void>>> = {}

export function registerSessionReplacedHandler(role: Role, fn: (() => void | Promise<void>) | null): void {
	if (fn) sessionReplacedHandlers[role] = fn
	else delete sessionReplacedHandlers[role]
}

/** True if a parsed 401 body (H3 error shape) says the session was replaced. */
export function isSessionReplacedBody(body: unknown): boolean {
	if (!body || typeof body !== 'object') return false
	const b = body as { data?: { reason?: unknown } | null; reason?: unknown }
	return b.data?.reason === 'session_replaced' || b.reason === 'session_replaced'
}

/** Runs the registered replaced-handler for the role, else generic 401 handling. */
export async function handleSessionReplaced(isAdmin?: boolean): Promise<void> {
	const handler = sessionReplacedHandlers[isAdmin ? 'admin' : 'consumer']
	if (handler) {
		await handler()
		return
	}
	await handleUnauthorized(isAdmin)
}

/**
 * User-initiated consumer logout: clears the local session FIRST (which
 * synchronously stops the session stream so this device can't receive its own
 * session_replaced), then tells the server. Failures are ignored.
 */
export async function signOutConsumer(): Promise<void> {
	const token = localStorage.getItem(TOKEN_KEY)
	const { useAuthStore } = await import('@/stores/authStore')
	useAuthStore().logout()
	notifyServerLogout('/api/auth/logout', token)

	// Clear the app badge and cancel any scheduled reminders on logout.
	try {
		const { clearBadge } = await import('@/utils/appBadge')
		await clearBadge()
		const { cancelAllReminders } = await import('@/utils/reminderScheduler')
		await cancelAllReminders()
	} catch {
		/* non-critical — best-effort cleanup */
	}
}

/** User-initiated admin logout; see signOutConsumer. */
export async function signOutAdmin(): Promise<void> {
	const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
	const { useAdminAuthStore } = await import('@/stores/adminAuthStore')
	useAdminAuthStore().logout()
	notifyServerLogout('/api/admin/logout', token)
}

function notifyServerLogout(endpoint: string, token: string | null): void {
	if (!token) return
	try {
		void fetch(`${API_BASE_URL}${endpoint}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
			keepalive: true,
		}).catch(() => {})
	} catch {
		/* ignore */
	}
}

export async function handleUnauthorized(isAdmin?: boolean): Promise<void> {
	if (isAdmin) {
		const { useAdminAuthStore } = await import('@/stores/adminAuthStore')
		const adminAuthStore = useAdminAuthStore()
		adminAuthStore.logout()

		if (sessionReplacedNotice.admin) return

		if (router.currentRoute.value.name !== 'admin-login') {
			router.push({ path: '/admin/login' })
		}
		return
	}

	const { useAuthStore } = await import('@/stores/authStore')
	const authStore = useAuthStore()
	authStore.logout()

	if (sessionReplacedNotice.consumer) return

	if (router.currentRoute.value.name !== 'welcome') {
		window.location.href = 'https://omniscan.website'
	}
}

export async function apiFetch<T = unknown>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
	const { body, skipAuth, isAdmin, headers, ...restOptions } = options

	const finalHeaders = new Headers(headers)
	finalHeaders.set('Content-Type', 'application/json')

	if (!isAuthExempt(endpoint, skipAuth)) {
		const token = getToken(isAdmin)
		if (token) {
			finalHeaders.set('Authorization', `Bearer ${token}`)
		}
	}

	let response: Response

	try {
		response = await fetch(`${API_BASE_URL}${endpoint}`, {
			...restOptions,
			headers: finalHeaders,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		})
	} catch (networkErr) {
		throw new ApiError('Network error — could not reach the server.', 0, networkErr)
	}

	const data = await parseJsonSafely(response)

	if (response.status === 401 && !isAuthExempt(endpoint, skipAuth)) {
		if (isSessionReplacedBody(data)) {
			await handleSessionReplaced(isAdmin)
		} else {
			await handleUnauthorized(isAdmin)
		}
		throw new ApiError('Unauthorized. Please log in again.', 401, data)
	}

	if (!response.ok) {
		const message =
			(data as { statusMessage?: string; message?: string } | null)?.statusMessage ||
			(data as { statusMessage?: string; message?: string } | null)?.message ||
			`Request failed with status ${response.status}`
		throw new ApiError(message, response.status, data)
	}

	return data as T
}
