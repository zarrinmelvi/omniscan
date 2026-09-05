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
			const response = await apiFetch<AdminLoginResponse>('/api/admin/login', {
				method: 'POST',
				body: { username, password },
				skipAuth: true,
				isAdmin: true,
			})

			localStorage.setItem(ADMIN_TOKEN_KEY, response.token)
			localStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin))
			this.token = response.token
			this.admin = response.admin

			return response
		},

		logout(): void {
			this.admin = null
			this.token = null
			localStorage.removeItem(ADMIN_TOKEN_KEY)
			localStorage.removeItem(ADMIN_KEY)
		},

		// Synchronous, unlike the user store's checkAuth() — restores from
		// localStorage only, no network round trip (see ADMIN_KEY comment
		// above for why). Call this before checking isAuthenticated on any
		// fresh page load, since Pinia state doesn't survive a reload on its
		// own.
		checkAdminAuth(): void {
			const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY)
			const storedAdmin = localStorage.getItem(ADMIN_KEY)

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
				localStorage.removeItem(ADMIN_TOKEN_KEY)
				localStorage.removeItem(ADMIN_KEY)
			}
		},
	},
})
