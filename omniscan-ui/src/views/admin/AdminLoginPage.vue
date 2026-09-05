<template>
	<div class="admin-login">
		<div class="login-card">
			<div class="brand-icon">🛡️</div>
			<h1>OmniScan Admin Portal</h1>
			<p class="subtitle">Sign in to your admin account</p>

			<div class="divider"><span>SECURE ADMIN ACCESS</span></div>

			<form @submit.prevent="handleLogin">
				<!-- NOTE: the proposal's mockup labels this "Admin Email", but the
				     actual backend (Admin model + login.post.ts) authenticates by
				     username, not email — kept functional over cosmetic fidelity
				     here. -->
				<label>
					Admin Username
					<input v-model="username" type="text" autocomplete="username" required />
				</label>
				<label>
					Password
					<input v-model="password" type="password" autocomplete="current-password" required />
				</label>
				<p v-if="errorMessage" class="error">{{ errorMessage }}</p>
				<button type="submit" :disabled="isSubmitting">
					{{ isSubmitting ? 'Signing in…' : 'Sign In' }}
				</button>
			</form>

			<p class="footer-note">Access restricted to authorized administrators.</p>
		</div>
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
	align-items: center;
	justify-content: center;
	background: #f4f5f7;
	font-family:
		system-ui,
		-apple-system,
		sans-serif;
}
.login-card {
	background: white;
	padding: 40px;
	border-radius: 12px;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
	width: 360px;
	text-align: center;
}
.brand-icon {
	width: 48px;
	height: 48px;
	background: #16a34a;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.4rem;
	margin: 0 auto 16px;
}
h1 {
	font-size: 1.15rem;
	margin: 0 0 4px;
	color: #111827;
}
.subtitle {
	font-size: 0.85rem;
	color: #6b7280;
	margin: 0 0 20px;
}
.divider {
	display: flex;
	align-items: center;
	margin-bottom: 20px;
}
.divider::before,
.divider::after {
	content: '';
	flex: 1;
	height: 1px;
	background: #e5e7eb;
}
.divider span {
	padding: 0 10px;
	font-size: 0.65rem;
	letter-spacing: 0.05em;
	color: #9ca3af;
}
form {
	text-align: left;
}
label {
	display: block;
	font-size: 0.8rem;
	color: #374151;
	margin-bottom: 14px;
}
input {
	display: block;
	width: 100%;
	margin-top: 5px;
	padding: 9px 10px;
	border: 1px solid #d1d5db;
	border-radius: 6px;
	box-sizing: border-box;
	font-size: 0.9rem;
}
button {
	width: 100%;
	padding: 11px;
	background: #16a34a;
	color: white;
	border: none;
	border-radius: 6px;
	font-size: 0.9rem;
	font-weight: 600;
	cursor: pointer;
	margin-top: 4px;
}
button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
.error {
	color: #dc2626;
	font-size: 0.8rem;
	margin: -4px 0 10px;
}
.footer-note {
	margin: 20px 0 0;
	font-size: 0.7rem;
	color: #9ca3af;
}
</style>
