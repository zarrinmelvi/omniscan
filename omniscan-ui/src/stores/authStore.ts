import { defineStore } from 'pinia'
import { apiFetch, ApiError } from '@/utils/api'

const TOKEN_KEY = 'omniscan_token'
const ADMIN_TOKEN_KEY = 'omniscan_admin_token'
const ADMIN_KEY = 'omniscan_admin'

export interface AuthUser {
	id: number
	name: string
	email: string
	first_name?: string | null
	last_name?: string | null
	username?: string | null
}

interface LoginResponse {
	token: string
	user: AuthUser
	message: string
}

interface RegisterResponse {
	requiresVerification: boolean
	email: string
	message: string
}

interface MeResponse {
	user: AuthUser
}

interface AuthState {
	user: AuthUser | null
	token: string | null
}

export const useAuthStore = defineStore('auth', {
	state: (): AuthState => ({
		user: null,
		token: null,
	}),

	getters: {
		isAuthenticated: (state): boolean => !!state.token && !!state.user,
	},

	actions: {
		async login(email: string, password: string): Promise<LoginResponse> {
			// Bug 1a fix — cross-tab: directly remove admin tokens from sessionStorage
			// before proceeding. sessionStorage is tab-scoped so this clears the
			// current tab's admin session only (correct behavior — other tabs have
			// independent sessionStorage). This is synchronous so it completes before
			// the network call, avoiding any race with concurrent navigations.
			sessionStorage.removeItem(ADMIN_TOKEN_KEY)
			sessionStorage.removeItem(ADMIN_KEY)

			// Also reset the current tab's admin Pinia instance (same-tab isolation).
			// Dynamic import avoids the circular dependency at module load time.
			const { useAdminAuthStore } = await import('@/stores/adminAuthStore')
			const adminAuthStore = useAdminAuthStore()
			adminAuthStore.admin = null
			adminAuthStore.token = null

			const response = await apiFetch<LoginResponse>('/api/auth/login', {
				method: 'POST',
				body: { email, password },
				skipAuth: true,
			})

			localStorage.setItem(TOKEN_KEY, response.token)
			this.token = response.token
			this.user = response.user

			return response
		},

		async register(firstName: string, lastName: string, username: string, email: string, password: string): Promise<RegisterResponse> {
			const response = await apiFetch<RegisterResponse>('/api/auth/register', {
				method: 'POST',
				body: { first_name: firstName, last_name: lastName, username, email, password },
				skipAuth: true,
			})
			return response
		},

		async loginWithOAuthToken(token: string): Promise<void> {
			// Clear any admin session (cross-session isolation, same as password login)
			sessionStorage.removeItem('omniscan_admin_token')
			sessionStorage.removeItem('omniscan_admin')
			const { useAdminAuthStore } = await import('@/stores/adminAuthStore')
			const adminAuthStore = useAdminAuthStore()
			adminAuthStore.admin = null
			adminAuthStore.token = null

			localStorage.setItem('omniscan_token', token)
			this.token = token
			// Hydrate the user from /api/auth/me
			await this.checkAuth()
		},

		logout(): void {
			this.user = null
			this.token = null
			localStorage.removeItem(TOKEN_KEY)
		},

		async checkAuth(): Promise<void> {
			// Cross-tab session isolation guard: if an admin session is active in
			// sessionStorage, no consumer session may coexist. Force consumer logout.
			// This fires on every navigation via the router beforeEach guard, so
			// Tab A will detect that Tab B logged in as admin on the next navigation
			// or page refresh — the consumer session is invalidated immediately.
			const adminTokenPresent = !!sessionStorage.getItem(ADMIN_TOKEN_KEY)
			if (adminTokenPresent) {
				this.user = null
				this.token = null
				localStorage.removeItem(TOKEN_KEY)
				return
			}

			const storedToken = localStorage.getItem(TOKEN_KEY)

			if (!storedToken) {
				this.user = null
				this.token = null
				return
			}

			this.token = storedToken

			try {
				const response = await apiFetch<MeResponse>('/api/auth/me', { method: 'GET' })
				this.user = response.user
			} catch (err) {
				if (err instanceof ApiError && err.status !== 401) {
					console.error('checkAuth failed:', err.message)
				}
				this.user = null
				this.token = null
				localStorage.removeItem(TOKEN_KEY)
			}
		},
	},
})
