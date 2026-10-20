import { defineStore } from 'pinia'
import { apiFetch } from '@/utils/api'

const ADMIN_TOKEN_KEY = 'omniscan_admin_token'
const ADMIN_KEY = 'omniscan_admin'
const TOKEN_KEY = 'omniscan_token'

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
			// Bug 1b fix — cross-tab: directly remove consumer token from localStorage.
			// localStorage IS shared across tabs, so this synchronous removal immediately
			// invalidates the consumer session in ALL tabs. When any other tab next calls
			// checkAuth() (on navigation or refresh), it finds no token and logs out.
			localStorage.removeItem(TOKEN_KEY)

			// Also reset the current tab's consumer Pinia instance (same-tab isolation).
			// Dynamic import avoids the circular dependency at module load time.
			const { useAuthStore } = await import('@/stores/authStore')
			const authStore = useAuthStore()
			authStore.user = null
			authStore.token = null

			const response = await apiFetch<AdminLoginResponse>('/api/admin/login', {
				method: 'POST',
				body: { username, password },
				skipAuth: true,
				isAdmin: true,
			})

			// Bug 2 fix: use sessionStorage so admin credentials clear on tab close.
			sessionStorage.setItem(ADMIN_TOKEN_KEY, response.token)
			sessionStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin))
			this.token = response.token
			this.admin = response.admin

			return response
		},

		logout(): void {
			this.admin = null
			this.token = null
			sessionStorage.removeItem(ADMIN_TOKEN_KEY)
			sessionStorage.removeItem(ADMIN_KEY)
			document.documentElement.classList.remove('ion-palette-dark')
			localStorage.removeItem('omniscan_dark_mode')
		},

		checkAdminAuth(): void {
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
