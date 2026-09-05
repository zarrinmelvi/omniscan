import { defineStore } from 'pinia'
import { apiFetch, ApiError } from '@/utils/api'

const TOKEN_KEY = 'omniscan_token'

export interface AuthUser {
	id: number
	name: string
	email: string
}

interface LoginResponse {
	token: string
	user: AuthUser
	message: string
}

interface RegisterResponse {
	user: AuthUser
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
		// Derived, not raw state — kept in sync with user/token automatically
		isAuthenticated: (state): boolean => !!state.token && !!state.user,
	},

	actions: {
		async login(email: string, password: string): Promise<LoginResponse> {
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

		async register(name: string, email: string, password: string): Promise<RegisterResponse> {
			const response = await apiFetch<RegisterResponse>('/api/auth/register', {
				method: 'POST',
				body: { name, email, password },
				skipAuth: true,
			})

			return response // does not auto-login — caller decides what happens next
		},

		logout(): void {
			this.user = null
			this.token = null
			localStorage.removeItem(TOKEN_KEY)
		},

		async checkAuth(): Promise<void> {
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
