<template>
	<ion-page>
		<ion-content class="auth-content">
			<div class="auth-layout">
				<aside class="auth-brand-panel">
					<div class="brand-panel-inner">
						<span class="brand-panel-name">OmniScan</span>
						<p class="brand-panel-tagline">Scan with confidence. Live with intention.</p>
						<ul class="brand-features">
							<li>
								<span class="feature-icon">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
								</span>
								Scan any food label
							</li>
							<li>
								<span class="feature-icon">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
								</span>
								Get alerts for your allergens
							</li>
							<li>
								<span class="feature-icon">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
								</span>
								Keep your pantry organized
							</li>
						</ul>
					</div>
				</aside>
				<div class="auth-card">
					<div class="auth-topbar">
						<button type="button" class="back-to-home" @click="goToLandingPage">
							<ion-icon :icon="chevronBackOutline" />
							Back to home
						</button>
						<div class="dark-mode-toggle-row">
							<span>Dark mode</span>
							<ion-toggle :checked="isDark" @ion-change="toggleDarkMode" class="custom-toggle" />
						</div>
					</div>

					<span class="brand-label">OmniScan</span>
					<h1 class="auth-title">Welcome Back</h1>
					<p class="auth-subtitle">Sign in to continue managing your pantry</p>

					<div v-if="errorMessage" class="form-error">
						{{ errorMessage }}
						<div v-if="requiresVerification" class="resend-row">
							<ion-button
								size="small"
								fill="outline"
								class="resend-inline-button"
								:disabled="isResending || cooldown > 0"
								@click="handleResend">
								<ion-spinner v-if="isResending" name="crescent" class="btn-spinner" />
								<span v-else-if="cooldown > 0">Resend in {{ cooldown }}s</span>
								<span v-else>Resend verification email</span>
							</ion-button>
						</div>
					</div>

					<div v-if="sessionReplaced" class="banner-warning" role="status">
						You were signed out because your account was signed in on another device.
					</div>

					<div v-if="googleCancelled" class="banner-warning">
						Google sign-in was cancelled. Try again or use your email.
					</div>

					<div v-if="resendSuccess" class="form-success">
						Verification email sent! Check your inbox.
					</div>

					<form @submit.prevent="handleLogin">
						<div class="form-group">
							<label class="input-label">Email Address</label>
							<div class="custom-input-wrapper">
								<input v-model="email" type="email" placeholder="your@email.com" required class="custom-input" :class="{ 'input-error': !!errorMessage }" />
							</div>
						</div>

						<div class="form-group">
							<label class="input-label">Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="password"
									:type="showPassword ? 'text' : 'password'"
									placeholder="Enter your password"
									required
									class="custom-input"
									:class="{ 'input-error': !!errorMessage }" />
								<ion-icon
									:icon="showPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showPassword = !showPassword" />
							</div>
						</div>

						<div class="form-row">
							<label class="checkbox-container">
								<input v-model="rememberMe" type="checkbox" class="custom-checkbox-input" />
								<span class="custom-checkbox-box"></span>
								<span class="remember-label">Remember me</span>
							</label>
							<router-link to="/forgot-password" class="forgot-link">Forgot password?</router-link>
						</div>

						<ion-button expand="block" type="submit" class="submit-button" :disabled="isSubmitting">
							<ion-spinner v-if="isSubmitting" name="crescent" class="btn-spinner" />
							<span v-else>Sign In</span>
						</ion-button>
					</form>

					<div class="oauth-divider"><span>or</span></div>
					<button type="button" class="google-btn" :disabled="isGoogleSubmitting" @click="handleGoogleSignIn">
						<ion-spinner v-if="isGoogleSubmitting" name="crescent" class="btn-spinner" />
						<template v-else>
							<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							Sign in with Google
						</template>
					</button>

					<p class="switch-auth">
						Don't have an account?
						<router-link to="/register" class="switch-link">Create one</router-link>
					</p>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner, IonToggle, toastController } from '@ionic/vue'
import { chevronBackOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, ApiError, API_BASE_URL } from '@/utils/api'
import { useDarkMode } from '@/composables/useDarkMode'

const authStore = useAuthStore()
const route = useRoute()
const { isDark, toggle: toggleDarkMode } = useDarkMode()

const googleCancelled = computed(() => route.query.google_cancelled === '1')
const sessionReplaced = computed(() => route.query.reason === 'session_replaced')
const isGoogleSubmitting = ref(false)

async function showToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger') {
	const toast = await toastController.create({
		message,
		duration: 3500,
		color,
		position: 'top',
	})
	await toast.present()
}

function goToLandingPage(): void {
	window.location.href = 'https://omniscan.website'
}

async function handleGoogleSignIn(): Promise<void> {
	if (isGoogleSubmitting.value) return
	const isNative = Capacitor.isNativePlatform()

	if (isNative) {
		isGoogleSubmitting.value = true
		try {
			await GoogleSignIn.initialize({
				clientId: '394571296954-s5pjiqq3fg7hhcsm0i0tn6l4mfs69s7m.apps.googleusercontent.com',
			})

			const result = await GoogleSignIn.signIn()
			const idToken = result.idToken

			if (!idToken) {
				throw new Error('No ID Token returned from Google Sign-In')
			}

			await apiFetch('/api/auth/google/verify', {
				method: 'POST',
				body: { idToken },
				skipAuth: true,
			})

			await authStore.checkAuth()
			window.location.href = '/tabs/home'
		} catch (error: any) {
			console.error('Native Google Sign-In failed:', error)
			const errMsg = error?.message || 'Google sign-in failed. Please try again.'
			void showToast(errMsg, 'danger')
		} finally {
			isGoogleSubmitting.value = false
		}
	} else {
		window.location.href = `${API_BASE_URL}/api/auth/google`
	}
}

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const requiresVerification = ref(false)
const isResending = ref(false)
const resendSuccess = ref(false)
const cooldown = ref(0)

let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown(seconds = 60) {
	cooldown.value = seconds
	cooldownTimer = setInterval(() => {
		cooldown.value--
		if (cooldown.value <= 0) {
			clearInterval(cooldownTimer!)
			cooldownTimer = null
		}
	}, 1000)
}

async function handleResend() {
	if (!email.value || isResending.value || cooldown.value > 0) return

	isResending.value = true
	resendSuccess.value = false

	try {
		await apiFetch('/api/auth/resend-verification', {
			method: 'POST',
			body: { email: email.value },
			skipAuth: true,
		})
		resendSuccess.value = true
		errorMessage.value = null
		requiresVerification.value = false
		startCooldown(60)
	} catch (err) {
		if (err instanceof ApiError && err.status === 429) {
			const match = err.message.match(/(\d+) second/)
			const remaining = match ? parseInt(match[1]) : 60
			startCooldown(remaining)
		}
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to resend. Please try again.'
	} finally {
		isResending.value = false
	}
}

async function handleLogin(): Promise<void> {
	errorMessage.value = null
	requiresVerification.value = false
	resendSuccess.value = false
	isSubmitting.value = true

	try {
		await authStore.login(email.value, password.value)
		window.location.href = '/tabs/home'
	} catch (err) {
		if (err instanceof ApiError && err.status === 403) {
			requiresVerification.value = true
			errorMessage.value = 'Your email is not verified yet. Check your inbox or request a new link.'
		} else {
			errorMessage.value = err instanceof ApiError ? err.message : 'Login failed. Please try again.'
		}
	} finally {
		isSubmitting.value = false
	}
}

onUnmounted(() => {
	if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<style scoped>
.auth-content {
	--background: #ffffff;
}

.auth-layout {
	width: 100%;
}

.auth-brand-panel {
	display: none;
}

.auth-card {
	max-width: 380px;
	margin: 0 auto;
	padding: 12px 24px 32px;
	background: #ffffff;
}

.auth-topbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 32px;
}
.back-to-home {
	display: flex;
	align-items: center;
	gap: 6px;
	background: none;
	border: none;
	cursor: pointer;
	font-size: 0.85rem;
	color: #6b7280;
	padding: 0;
}
.dark-mode-toggle-row {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.82rem;
	color: #6b7280;
}

.brand-label {
	display: block;
	color: #05c450;
	font-weight: 600;
	font-size: 0.85rem;
	margin-bottom: 4px;
}

.auth-title {
	font-size: 1.85rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 6px;
	letter-spacing: -0.02em;
}

.auth-subtitle {
	color: #6b7280;
	font-size: 0.85rem;
	line-height: 1.4;
	margin: 0 0 24px;
}

.form-group {
	margin-bottom: 14px;
}

.input-label {
	display: block;
	font-size: 0.8rem;
	font-weight: 600;
	color: #374151;
	margin-bottom: 6px;
}

.custom-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.custom-input {
	width: 100%;
	height: 46px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 0 14px;
	font-size: 16px;
	color: #111827;
	outline: none;
	background: #ffffff;
	transition: border-color 0.2s;
}

.custom-input:focus {
	border-color: #05c450;
}

.custom-input::placeholder {
	color: #9ca3af;
}

.custom-input.input-error { border-color: #dc2626 !important; }

.password-toggle {
	position: absolute;
	right: 14px;
	font-size: 1.1rem;
	color: #6b7280;
	cursor: pointer;
}

.form-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 16px 0 28px;
}

.checkbox-container {
	position: relative;
	display: flex;
	align-items: center;
	cursor: pointer;
	user-select: none;
}

.custom-checkbox-input {
	position: absolute;
	opacity: 0;
	cursor: pointer;
	height: 0;
	width: 0;
}

.custom-checkbox-box {
	width: 18px;
	height: 18px;
	background-color: #ffffff;
	border: 1.5px solid #d1d5db;
	border-radius: 5px;
	transition: all 0.2s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.checkbox-container:hover .custom-checkbox-box {
	border-color: #05c450;
}

.custom-checkbox-input:checked ~ .custom-checkbox-box {
	background-color: #05c450;
	border-color: #05c450;
}

.custom-checkbox-box::after {
	content: '';
	width: 4px;
	height: 8px;
	border: solid #ffffff;
	border-width: 0 2px 2px 0;
	transform: rotate(45deg);
	opacity: 0;
	margin-bottom: 2px;
	transition: opacity 0.15s ease;
}

.custom-checkbox-input:checked ~ .custom-checkbox-box::after {
	opacity: 1;
}

.remember-label {
	font-size: 0.85rem;
	color: #374151;
	margin-left: 8px;
}

.forgot-link {
	color: #05c450;
	font-size: 0.85rem;
	font-weight: 600;
	text-decoration: none;
}

.submit-button {
	--background: #05c450;
	--background-activated: #04ab45;
	--border-radius: 9999px;
	--box-shadow: none;
	--color: #ffffff;
	font-weight: 600;
	font-size: 0.95rem;
	height: 48px;
	text-transform: none;
}

.switch-auth {
	text-align: center;
	margin-top: 24px;
	font-size: 0.85rem;
	color: #4b5563;
}

.switch-link {
	color: #05c450;
	font-weight: 600;
	text-decoration: none;
	margin-left: 2px;
}

.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 16px;
	font-size: 0.85rem;
}

.banner-warning {
	background: #fffbeb;
	border: 1px solid #fde68a;
	color: #92400e;
	border-radius: 8px;
	padding: 10px 14px;
	margin-bottom: 16px;
	font-size: 0.85rem;
}

.oauth-divider {
	display: flex;
	align-items: center;
	text-align: center;
	margin: 20px 0;
	color: #9ca3af;
	font-size: 0.8rem;
}
.oauth-divider::before, .oauth-divider::after {
	content: '';
	flex: 1;
	border-bottom: 1px solid #e5e7eb;
}
.oauth-divider span { padding: 0 12px; }
.google-btn {
	width: 100%;
	height: 46px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	border: 1px solid #e5e7eb;
	border-radius: 9999px;
	background: #ffffff;
	color: #374151;
	font-size: 0.9rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s, border-color 0.15s;
}
.google-btn:hover { background: #f9fafb; border-color: #d1d5db; }

.resend-row {
	margin-top: 10px;
}

.resend-inline-button {
	--border-radius: 9999px;
	--border-color: #b91c1c;
	--color: #b91c1c;
	--color-disabled: #9ca3af;
	font-weight: 600;
	font-size: 0.8rem;
	text-transform: none;
	height: 34px;
}

.btn-spinner {
	width: 16px;
	height: 16px;
}

.form-success {
	background: #f0fdf4;
	color: #15803d;
	border: 1px solid #bbf7d0;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 16px;
	font-size: 0.85rem;
}

.brand-features {
	list-style: none;
	padding: 0;
	margin: 28px 0 0;
	display: flex;
	flex-direction: column;
	gap: 16px;
}
.brand-features li {
	display: flex;
	align-items: center;
	gap: 12px;
	font-size: 0.9rem;
	opacity: 0.9;
}
.feature-icon {
	width: 32px;
	height: 32px;
	border-radius: 8px;
	background: rgba(255,255,255,0.15);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

:global(html.ion-palette-dark) .auth-content { --background: #0b160b; }
:global(html.ion-palette-dark) .auth-card { background: #0b160b; }
:global(html.ion-palette-dark) .auth-title { color: #f9fafb; }
:global(html.ion-palette-dark) .auth-subtitle { color: #9ca3af; }
:global(html.ion-palette-dark) .input-label { color: #d1d5db; }
:global(html.ion-palette-dark) .custom-input { background: #172617; border-color: #2d4a2d; color: #f9fafb; }
:global(html.ion-palette-dark) .custom-input::placeholder { color: #6b7280; }
:global(html.ion-palette-dark) .banner-warning { background: #2a2208; border-color: #5c4a10; color: #fcd34d; }
:global(html.ion-palette-dark) .google-btn { background: #172617; border-color: #2d4a2d; color: #f9fafb; }
:global(html.ion-palette-dark) .back-to-home { color: #9ca3af; }
:global(html.ion-palette-dark) .dark-mode-toggle-row { color: #9ca3af; }
:global(html.ion-palette-dark) .switch-auth { color: #9ca3af; }
:global(html.ion-palette-dark) .remember-label { color: #d1d5db; }
:global(html.ion-palette-dark) .oauth-divider { color: #6b7280; }

@media (min-width: 768px) {
	.auth-layout {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100%;
	}

	.auth-card {
		max-width: 460px;
		width: 100%;
		padding: 48px 40px 56px;
	}
}

@media (min-width: 1024px) {
	.auth-layout {
		display: grid;
		grid-template-columns: 45% 55%;
		min-height: 100%;
		align-items: stretch;
	}

	.auth-brand-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 64px;
		background: linear-gradient(135deg, #05c450 0%, #04863a 100%);
		color: #ffffff;
	}

	.brand-panel-inner {
		max-width: 360px;
	}

	.brand-panel-name {
		display: block;
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		margin-bottom: 16px;
	}

	.brand-panel-tagline {
		font-size: 1.15rem;
		line-height: 1.5;
		font-weight: 500;
		margin: 0;
		opacity: 0.95;
	}

	.auth-card {
		display: flex;
		flex-direction: column;
		justify-content: center;
		max-width: none;
		width: 100%;
		margin: 0;
		padding: 48px 64px;
	}

	.auth-card > * {
		width: 100%;
		max-width: 400px;
		margin-left: auto;
		margin-right: auto;
	}

	.auth-card .auth-topbar {
		display: flex;
	}
}
</style>