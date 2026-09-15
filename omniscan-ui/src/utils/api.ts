import router from '@/router'

const TOKEN_KEY = 'omniscan_token'
const ADMIN_TOKEN_KEY = 'omniscan_admin_token'
const AUTH_EXEMPT_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/admin/login']

// In local dev, this is left empty and Vite's dev-server proxy (vite.config.ts)
// forwards relative '/api/**' calls to http://localhost:3000 — nothing to
// configure. In production (Vercel), there's no such proxy: omniscan-ui is
// deployed as a separate static site from nitro-app, so a relative '/api/...'
// fetch would hit omniscan-ui's own domain instead of the backend. Set
// VITE_API_URL (e.g. to the nitro-app Vercel deployment's URL) in that
// project's Environment Variables to fix this — leave it unset locally.
export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

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
	return localStorage.getItem(isAdmin ? ADMIN_TOKEN_KEY : TOKEN_KEY)
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
async function handleUnauthorized(isAdmin?: boolean): Promise<void> {
	if (isAdmin) {
		const { useAdminAuthStore } = await import('@/stores/adminAuthStore')
		const adminAuthStore = useAdminAuthStore()
		adminAuthStore.logout()

		if (router.currentRoute.value.name !== 'admin-login') {
			router.push({ path: '/admin/login' })
		}
		return
	}

	const { useAuthStore } = await import('@/stores/authStore')
	const authStore = useAuthStore()
	authStore.logout()

	if (router.currentRoute.value.name !== 'login') {
		router.push({ path: '/login' })
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
		await handleUnauthorized(isAdmin)
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
