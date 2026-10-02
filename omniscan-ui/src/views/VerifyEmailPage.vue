<template>
	<ion-page>
		<ion-content class="auth-content" :scroll-y="true">
			<div class="auth-layout">
				<aside class="auth-brand-panel">
					<div class="brand-panel-inner">
						<span class="brand-panel-name">OmniScan</span>
						<p class="brand-panel-tagline">Scan with confidence. Live with intention.</p>
					</div>
				</aside>
				<div class="auth-card">
					<!-- Loading state -->
					<template v-if="state === 'loading'">
						<div class="state-icon-wrapper">
							<ion-spinner name="crescent" class="verify-spinner" />
						</div>
						<h1 class="auth-title">Verifying your email…</h1>
						<p class="auth-subtitle">Please wait a moment.</p>
					</template>

					<!-- Success state -->
					<template v-else-if="state === 'success'">
						<div class="state-icon-wrapper">
							<ion-icon :icon="checkmarkCircleOutline" class="state-icon state-icon--success" />
						</div>
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">Email Verified!</h1>
						<p class="auth-subtitle">
							Your account is now active. Taking you home
							<span v-if="redirectCountdown > 0"> in {{ redirectCountdown }}s</span>…
						</p>
						<ion-button expand="block" class="submit-button" @click="goToHome">
							Continue to Home
						</ion-button>
					</template>

					<!-- Already verified state -->
					<template v-else-if="state === 'already-verified'">
						<div class="state-icon-wrapper">
							<ion-icon :icon="checkmarkCircleOutline" class="state-icon state-icon--success" />
						</div>
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">Already Verified</h1>
						<p class="auth-subtitle">This email address is already verified. Redirecting to login…</p>
						<ion-button expand="block" class="submit-button" @click="() => router.push('/login')">
							Go to Login
						</ion-button>
					</template>

					<!-- Expired token state -->
					<template v-else-if="state === 'expired'">
						<div class="state-icon-wrapper">
							<ion-icon :icon="timeOutline" class="state-icon state-icon--warning" />
						</div>
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">Link Expired</h1>
						<p class="auth-subtitle">
							This verification link has expired. Enter your email below to receive a new one.
						</p>

						<div v-if="resendSuccess" class="feedback-banner feedback-banner--success">
							<ion-icon :icon="checkmarkCircleOutline" />
							Verification email sent! Check your inbox.
						</div>
						<div v-if="resendError" class="feedback-banner feedback-banner--error">
							<ion-icon :icon="alertCircleOutline" />
							{{ resendError }}
						</div>

						<div class="form-group">
							<label class="input-label">Email Address</label>
							<div class="custom-input-wrapper">
								<input
									v-model="resendEmail"
									type="email"
									placeholder="your@email.com"
									class="custom-input" />
							</div>
						</div>

						<ion-button
							expand="block"
							class="submit-button"
							:disabled="isResending || cooldown > 0"
							@click="handleResend">
							<ion-spinner v-if="isResending" name="crescent" class="btn-spinner" />
							<span v-else-if="cooldown > 0">Resend in {{ cooldown }}s</span>
							<span v-else>Send New Verification Link</span>
						</ion-button>

						<p class="switch-auth">
							<router-link to="/login" class="switch-link">Back to Login</router-link>
						</p>
					</template>

					<!-- Generic error state -->
					<template v-else-if="state === 'error'">
						<div class="state-icon-wrapper">
							<ion-icon :icon="closeCircleOutline" class="state-icon state-icon--error" />
						</div>
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">Verification Failed</h1>
						<p class="auth-subtitle">{{ errorMessage }}</p>

						<ion-button expand="block" class="submit-button" router-link="/login">
							Back to Login
						</ion-button>
					</template>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import {
	checkmarkCircleOutline,
	alertCircleOutline,
	closeCircleOutline,
	timeOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

const TOKEN_KEY = 'omniscan_token'

type VerifyState = 'loading' | 'success' | 'already-verified' | 'expired' | 'error'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const state = ref<VerifyState>('loading')
const errorMessage = ref('')
const redirectCountdown = ref(3)
const resendEmail = ref('')
const isResending = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')
const cooldown = ref(0)

let redirectTimer: ReturnType<typeof setInterval> | null = null
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startRedirect() {
	redirectTimer = setInterval(() => {
		redirectCountdown.value--
		if (redirectCountdown.value <= 0) {
			clearInterval(redirectTimer!)
			goToHome()
		}
	}, 1000)
}

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

async function verifyToken() {
	const token = route.params.token as string

	if (!token) {
		state.value = 'error'
		errorMessage.value = 'No verification token found in the link.'
		return
	}

	try {
		const result = await apiFetch<{ success: boolean; token: string; user: { id: number; name: string; email: string } }>(`/api/auth/verify/${token}`, {
			method: 'GET',
			skipAuth: true,
		})

		if (result.token) {
			localStorage.setItem(TOKEN_KEY, result.token)
			// Populate the auth store so isAuthenticated is true immediately
			// (checkAuth reads the token we just stored and loads /api/auth/me).
			authStore.token = result.token
			await authStore.checkAuth()
		}

		state.value = 'success'
		startRedirect()
	} catch (err) {
		if (err instanceof ApiError) {
			const msg = err.message.toLowerCase()
			if (msg.includes('already verified')) {
				state.value = 'already-verified'
				setTimeout(() => router.push('/login'), 2500)
			} else if (msg.includes('expired')) {
				state.value = 'expired'
			} else {
				state.value = 'error'
				errorMessage.value = err.message
			}
		} else {
			state.value = 'error'
			errorMessage.value = 'Verification failed. Please try again.'
		}
	}
}

async function handleResend() {
	if (!resendEmail.value || isResending.value || cooldown.value > 0) return

	isResending.value = true
	resendSuccess.value = false
	resendError.value = ''

	try {
		await apiFetch('/api/auth/resend-verification', {
			method: 'POST',
			body: { email: resendEmail.value },
			skipAuth: true,
		})
		resendSuccess.value = true
		startCooldown(60)
	} catch (err) {
		if (err instanceof ApiError && err.status === 429) {
			const match = err.message.match(/(\d+) second/)
			const remaining = match ? parseInt(match[1]) : 60
			startCooldown(remaining)
		}
		resendError.value = err instanceof ApiError ? err.message : 'Failed to resend. Please try again.'
	} finally {
		isResending.value = false
	}
}

function goToHome() {
	router.push('/tabs/home')
}

onMounted(() => {
	verifyToken()
})

onUnmounted(() => {
	if (redirectTimer) clearInterval(redirectTimer)
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
	padding: 40px 24px 80px;
	background: #ffffff;
	min-height: 100%;
}

.state-icon-wrapper {
	display: flex;
	justify-content: center;
	margin-bottom: 20px;
}

.verify-spinner {
	width: 56px;
	height: 56px;
	color: #05c450;
}

.state-icon {
	font-size: 3.5rem;
}

.state-icon--success {
	color: #05c450;
}

.state-icon--warning {
	color: #d97706;
}

.state-icon--error {
	color: #ef4444;
}

.brand-label {
	display: block;
	color: #05c450;
	font-weight: 600;
	font-size: 0.85rem;
	margin-bottom: 4px;
	text-align: center;
}

.auth-title {
	font-size: 1.85rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 10px;
	letter-spacing: -0.02em;
	text-align: center;
}

.auth-subtitle {
	color: #6b7280;
	font-size: 0.9rem;
	line-height: 1.5;
	margin: 0 0 24px;
	text-align: center;
}

.feedback-banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 14px;
	border-radius: 10px;
	font-size: 0.85rem;
	margin-bottom: 16px;
	line-height: 1.4;
}

.feedback-banner--success {
	background: #f0fdf4;
	color: #15803d;
	border: 1px solid #bbf7d0;
}

.feedback-banner--error {
	background: #fee2e2;
	color: #b91c1c;
	border: 1px solid #fecaca;
}

.form-group {
	margin-bottom: 16px;
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
	box-sizing: border-box;
}

.custom-input:focus {
	border-color: #05c450;
}

.custom-input::placeholder {
	color: #9ca3af;
}

.submit-button {
	--background: #05c450;
	--background-activated: #04ab45;
	--background-disabled: #d1fae5;
	--border-radius: 9999px;
	--box-shadow: none;
	--color: #ffffff;
	--color-disabled: #6b7280;
	font-weight: 600;
	font-size: 0.95rem;
	height: 48px;
	text-transform: none;
}

.btn-spinner {
	width: 20px;
	height: 20px;
	color: #ffffff;
}

.switch-auth {
	text-align: center;
	margin-top: 16px;
	font-size: 0.85rem;
	color: #4b5563;
}

.switch-link {
	color: #05c450;
	font-weight: 600;
	text-decoration: none;
}

/* TABLET */
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

/* DESKTOP */
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

	.state-icon-wrapper {
		margin-left: auto;
		margin-right: auto;
		width: fit-content;
	}
}
</style>