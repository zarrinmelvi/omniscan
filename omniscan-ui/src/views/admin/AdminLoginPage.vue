<template>
	<div class="admin-login">
		<!-- Brand / Header -->
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

		<!-- Login card -->
		<div class="login-card">
			<div class="card-header">SECURE ADMIN ACCESS</div>

			<div class="card-body">
				<!-- Session-expired banner (amber) -->
				<div v-if="sessionExpired && !errorMessage" class="banner banner--session">
					Your session ended. Sign in again to continue.
				</div>

				<!-- Wrong credentials banner (red) -->
				<div v-if="errorMessage" class="banner banner--error">
					{{ errorMessage }}
				</div>

				<form @submit.prevent="handleLogin">
					<label>
						Admin Username
						<input
							v-model="username"
							type="text"
							placeholder="Username"
							autocomplete="username"
							required
							:class="{ 'input-error': !!errorMessage }"
						/>
					</label>

					<label>
						Password
						<div class="pw-wrap">
							<input
								v-model="password"
								:type="showPassword ? 'text' : 'password'"
								placeholder="Password"
								autocomplete="current-password"
								required
								:class="{ 'input-error': !!errorMessage }"
							/>
							<button
								type="button"
								class="pw-toggle"
								@click="showPassword = !showPassword"
								tabindex="-1"
								:aria-label="showPassword ? 'Hide password' : 'Show password'"
							>
								<svg v-if="!showPassword" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
									<circle cx="12" cy="12" r="3"></circle>
								</svg>
								<svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
									<line x1="1" y1="1" x2="23" y2="23"></line>
								</svg>
							</button>
						</div>
					</label>

					<button type="submit" class="btn-submit" :disabled="isSubmitting">
						{{ isSubmitting ? 'Signing in…' : 'Sign In' }}
					</button>
				</form>

				<p class="footer-note">Access restricted to authorized OmniScan administrators.</p>
			</div>
		</div>

		<footer class="page-footer">© 2026 OmniScan · All rights reserved</footer>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuthStore'
import { ApiError } from '@/utils/api'

const router = useRouter()
const route  = useRoute()
const adminAuthStore = useAdminAuthStore()

const username    = ref('')
const password    = ref('')
const showPassword = ref(false)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

// Show amber session-expired banner when redirected with ?reason=session_expired
const sessionExpired = computed(() => route.query.reason === 'session_expired')

async function handleLogin(): Promise<void> {
	isSubmitting.value  = true
	errorMessage.value  = null

	try {
		await adminAuthStore.login(username.value, password.value)
		router.push({ path: '/admin/dashboard' })
	} catch {
		// Always show the same neutral message — never reveal which field was wrong.
		errorMessage.value = 'Incorrect username or password.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<style scoped>
/* ── Page shell — always dark ─────────────────────── */
.admin-login {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	box-sizing: border-box;
	background-color: #0f1a0f;
	background-image:
		linear-gradient(to right,  rgba(255,255,255,0.04) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
	background-size: 32px 32px;
	font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── Brand header ─────────────────────────────────── */
.header-section {
	text-align: center;
	margin-bottom: 24px;
	width: 100%;
	max-width: 360px;
}

.brand-icon {
	width: 52px;
	height: 52px;
	background: #16a34a;
	color: #fff;
	border-radius: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 16px;
	box-shadow: 0 4px 16px rgba(22, 163, 74, 0.35);
}

h1 {
	font-size: 1.5rem;
	font-weight: 400;
	margin: 0 0 6px;
	color: #d1d5db;
}
h1 strong { font-weight: 700; color: #ffffff; }

.subtitle {
	font-size: 0.875rem;
	color: #9ca3af;
	margin: 0;
}

/* ── Card ─────────────────────────────────────────── */
.login-card {
	background: #1a2a1a;
	border-radius: 16px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	width: 100%;
	max-width: 360px;
	overflow: hidden;
}

.card-header {
	background: rgba(255, 255, 255, 0.04);
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	padding: 12px 20px;
	text-align: center;
	font-size: 0.68rem;
	font-weight: 700;
	letter-spacing: 0.1em;
	color: #6b7280;
}

.card-body { padding: 24px 28px 20px; }

/* ── Banners ──────────────────────────────────────── */
.banner {
	border-radius: 8px;
	padding: 10px 14px;
	font-size: 0.82rem;
	font-weight: 500;
	margin-bottom: 16px;
}
.banner--error {
	background: #450a0a;
	border: 1px solid #7f1d1d;
	color: #fca5a5;
}
.banner--session {
	background: #422006;
	border: 1px solid #78350f;
	color: #fed7aa;
}

/* ── Form ─────────────────────────────────────────── */
form {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

label {
	display: flex;
	flex-direction: column;
	gap: 6px;
	font-size: 0.82rem;
	font-weight: 600;
	color: #d1d5db;
}

input {
	width: 100%;
	padding: 10px 14px;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 8px;
	box-sizing: border-box;
	font-size: 0.9rem;
	color: #f9fafb;
	background: rgba(255, 255, 255, 0.06);
	outline: none;
	transition: border-color 0.15s, background 0.15s;
}
input::placeholder { color: #6b7280; }
input:focus {
	border-color: #16a34a;
	background: rgba(255, 255, 255, 0.09);
}
input.input-error { border-color: #dc2626 !important; }

/* ── Password field ───────────────────────────────── */
.pw-wrap {
	position: relative;
	display: flex;
	align-items: center;
}
.pw-wrap input { padding-right: 42px; }

.pw-toggle {
	position: absolute;
	right: 12px;
	background: none;
	border: none;
	padding: 4px;
	color: #6b7280;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	transition: color 0.15s;
}
.pw-toggle:hover { color: #9ca3af; }

/* ── Submit button ────────────────────────────────── */
.btn-submit {
	width: 100%;
	padding: 12px;
	background: #16a34a;
	color: #fff;
	border: none;
	border-radius: 8px;
	font-size: 0.95rem;
	font-weight: 600;
	cursor: pointer;
	margin-top: 4px;
	transition: background 0.15s;
}
.btn-submit:hover:not(:disabled) { background: #15803d; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Footer text ──────────────────────────────────── */
.footer-note {
	margin: 20px 0 0;
	font-size: 0.72rem;
	color: #4b5563;
	text-align: center;
}

.page-footer {
	margin-top: 28px;
	font-size: 0.78rem;
	color: #374151;
	text-align: center;
}
</style>
