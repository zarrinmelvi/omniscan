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
					<!-- Guard: email param missing -->
					<template v-if="!email">
						<div class="email-icon-wrapper">
							<ion-icon :icon="mailOutline" class="email-icon" />
						</div>
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">No Email Found</h1>
						<p class="auth-subtitle">
							This page requires an email address. Please register first.
						</p>
						<ion-button expand="block" class="resend-button" router-link="/register">
							Go to Register
						</ion-button>
					</template>

					<!-- STEP A: VERIFYING IN PROGRESS -->
					<template v-else-if="syncState === 'verifying'">
						<div class="email-icon-wrapper">
							<ion-spinner name="crescent" class="verify-spinner" />
						</div>
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">Verifying your email…</h1>
						<p class="auth-subtitle">Please wait a moment while we update your account.</p>
					</template>

					<!-- STEP B: EMAIL VERIFIED SUCCESS -->
					<template v-else-if="syncState === 'verified'">
						<div class="email-icon-wrapper">
							<ion-icon :icon="checkmarkCircleOutline" class="email-icon email-icon--success" />
						</div>
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">Email Verified!</h1>
						<p class="auth-subtitle">
							Your account is active. Setting up your profile
							<span v-if="redirectCountdown > 0"> in {{ redirectCountdown }}s</span>…
						</p>
						<ion-button expand="block" class="resend-button" @click="goToSetup">
							Continue to Setup
						</ion-button>
					</template>

					<!-- DEFAULT: CHECK YOUR EMAIL STATE -->
					<template v-else>
						<div class="email-icon-wrapper">
							<ion-icon :icon="mailOutline" class="email-icon" />
						</div>
						<h1 class="auth-title">Check Your Email</h1>
						<p class="auth-subtitle">
							We sent a verification link to<br />
							<strong class="email-highlight">{{ email }}</strong>
						</p>

						<!-- Success feedback -->
						<div v-if="successMessage" class="feedback-banner feedback-banner--success">
							<ion-icon :icon="checkmarkCircleOutline" />
							{{ successMessage }}
						</div>

						<!-- Error feedback -->
						<div v-if="errorMessage" class="feedback-banner feedback-banner--error">
							<ion-icon :icon="alertCircleOutline" />
							{{ errorMessage }}
						</div>

						<ion-button
							expand="block"
							class="resend-button"
							:disabled="isResending || cooldown > 0"
							@click="handleResend">
							<ion-spinner v-if="isResending" name="crescent" class="btn-spinner" />
							<span v-else-if="cooldown > 0">Resend in {{ cooldown }}s</span>
							<span v-else>Resend verification email</span>
						</ion-button>

						<div class="tips-box">
							<p class="tips-title">Didn't receive it?</p>
							<ul class="tips-list">
								<li>Check your spam or junk folder</li>
								<li>The link expires in 24 hours</li>
								<li>Make sure <strong>{{ email }}</strong> is correct</li>
							</ul>
						</div>

						<p class="switch-auth">
							Wrong email?
							<router-link to="/register" class="switch-link">Register again</router-link>
						</p>

						<p class="switch-auth">
							Already verified?
							<router-link to="/login" class="switch-link">Sign In</router-link>
						</p>
					</template>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import { mailOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons'
import { apiFetch } from '@/utils/api'

type SyncState = 'idle' | 'verifying' | 'verified'

const route = useRoute()
const email = ref((route.query.email as string) || '')

const syncState = ref<SyncState>('idle')
const isResending = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const cooldown = ref(0)
const redirectCountdown = ref(3)

let cooldownTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let redirectTimer: ReturnType<typeof setInterval> | null = null

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

function startRedirect() {
	redirectTimer = setInterval(() => {
		redirectCountdown.value--
		if (redirectCountdown.value <= 0) {
			clearInterval(redirectTimer!)
			goToSetup()
		}
	}, 1000)
}

function goToSetup() {
	window.location.href = '/register?step=2'
}

async function checkVerificationStatus() {
	if (!email.value || syncState.value !== 'idle') return

	try {
		const res = await apiFetch<{ email_verified?: boolean; verified?: boolean }>(
			`/api/auth/me?email=${encodeURIComponent(email.value)}`,
			{ method: 'GET', skipAuth: true }
		)

		if (res && (res.email_verified || res.verified)) {
			if (pollTimer) clearInterval(pollTimer)

			// Step A: Show "Verifying your email…"
			syncState.value = 'verifying'

			// Step B: Transition to "Email Verified!" -> Auto-redirect to Step 2
			setTimeout(() => {
				syncState.value = 'verified'
				startRedirect()
			}, 1200)
		}
	} catch (err) {
		// Silent check during background polling
	}
}

async function handleResend() {
	if (!email.value || isResending.value || cooldown.value > 0) return

	isResending.value = true
	successMessage.value = ''
	errorMessage.value = ''

	try {
		await apiFetch('/api/auth/resend-verification', {
			method: 'POST',
			body: { email: email.value },
			skipAuth: true,
		})
		successMessage.value = 'Verification email sent! Please check your inbox.'
		startCooldown(60)
	} catch (err: any) {
		if (err?.status === 429) {
			const match = err?.message?.match(/(\d+) second/)
			const remaining = match ? parseInt(match[1]) : 60
			startCooldown(remaining)
			errorMessage.value = err.message
		} else {
			errorMessage.value = err?.message ?? 'Failed to resend. Please try again.'
		}
	} finally {
		isResending.value = false
	}
}

function handleVisibilityChange() {
	if (document.visibilityState === 'visible') {
		checkVerificationStatus()
	}
}

onMounted(() => {
	startCooldown(60)
	if (email.value) {
		pollTimer = setInterval(checkVerificationStatus, 2500)
		window.addEventListener('visibilitychange', handleVisibilityChange)
	}
})

onUnmounted(() => {
	if (cooldownTimer) clearInterval(cooldownTimer)
	if (pollTimer) clearInterval(pollTimer)
	if (redirectTimer) clearInterval(redirectTimer)
	window.removeEventListener('visibilitychange', handleVisibilityChange)
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

.email-icon-wrapper {
	display: flex;
	justify-content: center;
	margin-bottom: 20px;
}

.email-icon {
	font-size: 3.5rem;
	color: #05c450;
}

.email-icon--success {
	color: #05c450;
}

.verify-spinner {
	width: 56px;
	height: 56px;
	color: #05c450;
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

.email-highlight {
	color: #111827;
	font-weight: 600;
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

.resend-button {
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
	margin-bottom: 24px;
}

.btn-spinner {
	width: 20px;
	height: 20px;
	color: #ffffff;
}

.tips-box {
	background: #f9fafb;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 16px 18px;
	margin-bottom: 24px;
}

.tips-title {
	font-size: 0.85rem;
	font-weight: 600;
	color: #374151;
	margin: 0 0 8px;
}

.tips-list {
	margin: 0;
	padding-left: 18px;
	list-style: disc;
}

.tips-list li {
	font-size: 0.82rem;
	color: #6b7280;
	line-height: 1.6;
}

.switch-auth {
	text-align: center;
	margin-top: 12px;
	font-size: 0.85rem;
	color: #4b5563;
}

.switch-link {
	color: #05c450;
	font-weight: 600;
	text-decoration: none;
	margin-left: 2px;
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

	.email-icon-wrapper {
		margin-left: auto;
		margin-right: auto;
		width: fit-content;
	}
}
</style>