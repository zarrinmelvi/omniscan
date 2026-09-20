<template>
	<div class="admin-login">
		<!-- Header / Brand Section -->
		<div class="header-section">
			<div class="brand-icon">
				<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
					<polyline points="9 12 11 14 15 10"></polyline>
				</svg>
			</div>
			<h1><strong>OmniScan</strong> Admin Portal</h1>
			<p class="subtitle">Sign in to your admin account</p>
		</div>

		<!-- Card Container -->
		<div class="login-card">
			<div class="card-header">
				SECURE ADMIN ACCESS
			</div>

			<div class="card-body">
				<form @submit.prevent="handleLogin">
					<!-- NOTE: the proposal's mockup labels this "Admin Email", but the
					     actual backend (Admin model + login.post.ts) authenticates by
					     username, not email — kept functional over cosmetic fidelity
					     here. -->
					<label>
						Admin Email
						<input 
							v-model="username" 
							type="text" 
							placeholder="you@omniscan.io"
							autocomplete="username" 
							required 
						/>
					</label>

					<label>
						Password
						<div class="password-input-wrapper">
							<input 
								v-model="password" 
								:type="showPassword ? 'text' : 'password'" 
								placeholder="Enter password"
								autocomplete="current-password" 
								required 
							/>
							<!-- Dynamic toggle button changing icon based on password visibility -->
							<button 
								type="button" 
								class="toggle-password" 
								@click="showPassword = !showPassword"
								tabindex="-1"
								:aria-label="showPassword ? 'Hide password' : 'Show password'"
							>
								<!-- Eye Icon (Password Hidden) -->
								<svg v-if="!showPassword" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
								<!-- Eye Off / Slash Icon (Password Visible) -->
								<svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
									<line x1="1" y1="1" x2="23" y2="23"></line>
								</svg>
							</button>
						</div>
					</label>

					<p v-if="errorMessage" class="error">{{ errorMessage }}</p>

					<button type="submit" class="btn-submit" :disabled="isSubmitting">
						{{ isSubmitting ? 'Signing in…' : 'Sign In' }}
					</button>
				</form>

				<p class="footer-note">Access restricted to authorized OmniScan administrators.</p>
			</div>
		</div>

		<footer class="page-footer">
			© 2026 OmniScan · All rights reserved
		</footer>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuthStore'
import { ApiError } from '@/utils/api'

const router = useRouter()
const adminAuthStore = useAdminAuthStore()

const username = ref('')
const password = ref('')
// Reactive boolean state controlling password visibility state
const showPassword = ref(false)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleLogin(): Promise<void> {
	isSubmitting.value = true
	errorMessage.value = null

	try {
		await adminAuthStore.login(username.value, password.value)
		router.push({ path: '/admin/dashboard' })
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Login failed.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<style scoped>
.admin-login {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	box-sizing: border-box;
	/* Grid background pattern */
	background-color: #f9fafb;
	background-image: 
		linear-gradient(to right, #f3f4f6 1px, transparent 1px),
		linear-gradient(to bottom, #f3f4f6 1px, transparent 1px);
	background-size: 24px 24px;
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header-section {
	text-align: center;
	margin-bottom: 24px;
}

.brand-icon {
	width: 52px;
	height: 52px;
	background: #008744;
	color: white;
	border-radius: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 16px;
	box-shadow: 0 4px 12px rgba(0, 135, 68, 0.2);
}

h1 {
	font-size: 1.5rem;
	font-weight: 400;
	margin: 0 0 6px;
	color: #4b5563;
}

h1 strong {
	font-weight: 700;
	color: #111827;
}

.subtitle {
	font-size: 0.9rem;
	color: #6b7280;
	margin: 0;
}

.login-card {
	background: #ffffff;
	border-radius: 16px;
	border: 1px solid #e5e7eb;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
	width: 100%;
	max-width: 420px;
	overflow: hidden;
}

.card-header {
	background: #f9fafb;
	border-bottom: 1px solid #f3f4f6;
	padding: 14px 20px;
	text-align: center;
	font-size: 0.72rem;
	font-weight: 600;
	letter-spacing: 0.06em;
	color: #6b7280;
}

.card-body {
	padding: 28px 32px 24px;
}

form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

label {
	display: flex;
	flex-direction: column;
	gap: 6px;
	font-size: 0.82rem;
	font-weight: 600;
	color: #374151;
}

input {
	width: 100%;
	padding: 10px 14px;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-sizing: border-box;
	font-size: 0.9rem;
	color: #111827;
	background: #ffffff;
	outline: none;
	transition: border-color 0.15s ease;
}

input::placeholder {
	color: #9ca3af;
}

input:focus {
	border-color: #008744;
}

.password-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.password-input-wrapper input {
	padding-right: 42px;
}

.toggle-password {
	position: absolute;
	right: 12px;
	background: none;
	border: none;
	padding: 4px;
	color: #9ca3af;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	transition: color 0.15s ease;
}

.toggle-password:hover {
	color: #4b5563;
}

.btn-submit {
	width: 100%;
	padding: 12px;
	background: #008744;
	color: white;
	border: none;
	border-radius: 8px;
	font-size: 0.95rem;
	font-weight: 600;
	cursor: pointer;
	margin-top: 4px;
	transition: background-color 0.15s ease;
}

.btn-submit:hover {
	background: #00753a;
}

.btn-submit:disabled {
	opacity: 0.65;
	cursor: not-allowed;
}

.error {
	color: #dc2626;
	font-size: 0.8rem;
	margin: 0;
}

.footer-note {
	margin: 24px 0 0;
	font-size: 0.75rem;
	color: #9ca3af;
	text-align: center;
}

.page-footer {
	margin-top: 32px;
	font-size: 0.8rem;
	color: #9ca3af;
	text-align: center;
}
</style>