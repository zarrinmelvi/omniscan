import { defineStore } from 'pinia'
import { apiFetch } from '@/utils/api'

const ADMIN_TOKEN_KEY = 'omniscan_admin_token'
// There's no GET /api/admin/me endpoint yet to re-verify the token against
// the server on page refresh (unlike the user authStore's checkAuth()), so
// the admin object itself is cached alongside the token and restored
// optimistically. An expired/invalid token surfaces the first time an
// actual admin API call 401s — handled by apiFetch's isAdmin-aware 401
// handling in utils/api.ts, which logs out and redirects to /admin/login.
const ADMIN_KEY = 'omniscan_admin'

export interface AuthAdmin {
	id: number
	full_name: string
	username: string
	email?: string | null
	role: string
}

interface AdminLoginResponse {
	token: string
	admin: AuthAdmin
	message: string
}

interface AdminAuthState {
	admin: AuthAdmin | null
	token: string | null
}

export const useAdminAuthStore = defineStore('adminAuth', {
	state: (): AdminAuthState => ({
		admin: null,
		token: null,
	}),

	getters: {
		isAuthenticated: (state): boolean => !!state.token && !!state.admin,
	},

	actions: {
		async login(username: string, password: string): Promise<AdminLoginResponse> {
			// Bug 1b fix: evict any active consumer session before establishing
			// the admin session — only one session type may be active at a time.
			// Dynamic import avoids a circular dependency at module load time
			// (adminAuthStore ↔ authStore would otherwise create a cycle).
			const { useAuthStore } = await import('@/stores/authStore')
			const authStore = useAuthStore()
			if (authStore.isAuthenticated) {
				authStore.logout()
			}

			const response = await apiFetch<AdminLoginResponse>('/api/admin/login', {
				method: 'POST',
				body: { username, password },
				skipAuth: true,
				isAdmin: true,
			})

			// Bug 2 fix: use sessionStorage instead of localStorage so admin
			// credentials are cleared automatically when the tab/window closes.
			sessionStorage.setItem(ADMIN_TOKEN_KEY, response.token)
			sessionStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin))
			this.token = response.token
			this.admin = response.admin

			return response
		},

		logout(): void {
			this.admin = null
			this.token = null
			// Bug 2 fix: remove from sessionStorage (was localStorage).
			sessionStorage.removeItem(ADMIN_TOKEN_KEY)
			sessionStorage.removeItem(ADMIN_KEY)
			// Strip dark mode class immediately so the login page doesn't
			// inherit it and cause a dark→light flash on logout.
			document.documentElement.classList.remove('ion-palette-dark')
			localStorage.removeItem('omniscan_dark_mode')
		},

		// Synchronous, unlike the user store's checkAuth() — restores from
		// sessionStorage only, no network round trip (see ADMIN_KEY comment
		// above for why). Call this before checking isAuthenticated on any
		// fresh page load, since Pinia state doesn't survive a reload on its
		// own.
		checkAdminAuth(): void {
			// Bug 2 fix: read from sessionStorage (was localStorage).
			const storedToken = sessionStorage.getItem(ADMIN_TOKEN_KEY)
			const storedAdmin = sessionStorage.getItem(ADMIN_KEY)

			if (!storedToken || !storedAdmin) {
				this.admin = null
				this.token = null
				return
			}

			try {
				this.admin = JSON.parse(storedAdmin) as AuthAdmin
				this.token = storedToken
			} catch {
				this.admin = null
				this.token = null
				sessionStorage.removeItem(ADMIN_TOKEN_KEY)
				sessionStorage.removeItem(ADMIN_KEY)
			}
		},
	},
})
