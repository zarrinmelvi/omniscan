<template>
	<ion-page>
		<ion-content class="auth-content">
			<div class="auth-layout">
				<aside class="auth-brand-panel">
					<div class="brand-panel-inner">
						<span class="brand-panel-name">OmniScan</span>
						<p class="brand-panel-tagline">Scan with confidence. Live with intention.</p>
					</div>
				</aside>

				<div class="auth-card">
					<button type="button" class="back-button" @click="router.push('/login')">
						<ion-icon :icon="chevronBackOutline" />
					</button>

					<span class="brand-label">OmniScan</span>
					<h1 class="auth-title">Forgot Password</h1>
					<p class="auth-subtitle">Enter your email and we'll send you a password reset link.</p>

					<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>
					<div v-if="successMessage" class="form-success">{{ successMessage }}</div>

					<form @submit.prevent="handleRequestReset">
						<div class="form-group">
							<label class="input-label">Email Address</label>
							<div class="custom-input-wrapper">
								<input v-model="email" type="email" placeholder="your@email.com" required class="custom-input" />
							</div>
						</div>

						<ion-button expand="block" type="submit" class="submit-button" :disabled="isSubmitting">
							<ion-spinner v-if="isSubmitting" name="crescent" class="btn-spinner" />
							<span v-else>Send Reset Link</span>
						</ion-button>
					</form>

					<p class="switch-auth">
						Remembered your password?
						<router-link to="/login" class="switch-link">Back to Sign In</router-link>
					</p>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import { chevronBackOutline } from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

const router = useRouter()
const email = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

async function handleRequestReset() {
	errorMessage.value = null
	successMessage.value = null
	isSubmitting.value = true

	try {
		const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
			method: 'POST',
			body: { email: email.value },
			skipAuth: true,
		})
		successMessage.value = res.message
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to request password reset.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<style scoped>
.auth-content { --background: #ffffff; }
.auth-layout { width: 100%; }
.auth-brand-panel { display: none; }
.auth-card { max-width: 380px; margin: 0 auto; padding: 12px 24px 32px; background: #ffffff; }
.back-button { background: none; border: none; font-size: 1.25rem; color: #111827; padding: 4px 0; margin-bottom: 24px; cursor: pointer; display: flex; align-items: center; }
.brand-label { display: block; color: #05c450; font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
.auth-title { font-size: 1.85rem; font-weight: 700; color: #111827; margin: 0 0 6px; letter-spacing: -0.02em; }
.auth-subtitle { color: #6b7280; font-size: 0.85rem; line-height: 1.4; margin: 0 0 24px; }
.form-group { margin-bottom: 14px; }
.input-label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
.custom-input { width: 100%; height: 46px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 0 14px; font-size: 16px; color: #111827; outline: none; background: #ffffff; }
.custom-input:focus { border-color: #05c450; }
.submit-button { --background: #05c450; --background-activated: #04ab45; --border-radius: 9999px; --color: #ffffff; font-weight: 600; font-size: 0.95rem; height: 48px; text-transform: none; margin-top: 16px; }
.btn-spinner { width: 18px; height: 18px; }
.switch-auth { text-align: center; margin-top: 24px; font-size: 0.85rem; color: #4b5563; }
.switch-link { color: #05c450; font-weight: 600; text-decoration: none; margin-left: 2px; }
.form-error { background: #fee2e2; color: #b91c1c; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; font-size: 0.85rem; }
.form-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; font-size: 0.85rem; }

@media (min-width: 768px) {
	.auth-layout { display: flex; align-items: center; justify-content: center; min-height: 100%; }
	.auth-card { max-width: 460px; width: 100%; padding: 48px 40px 56px; }
}

@media (min-width: 1024px) {
	.auth-layout { display: grid; grid-template-columns: 45% 55%; min-height: 100%; align-items: stretch; }
	.auth-brand-panel { display: flex; align-items: center; justify-content: center; padding: 64px; background: linear-gradient(135deg, #05c450 0%, #04863a 100%); color: #ffffff; }
	.brand-panel-inner { max-width: 360px; }
	.brand-panel-name { display: block; font-size: 2.5rem; font-weight: 700; margin-bottom: 16px; }
	.brand-panel-tagline { font-size: 1.15rem; line-height: 1.5; font-weight: 500; margin: 0; opacity: 0.95; }
	.auth-card { display: flex; flex-direction: column; justify-content: center; max-width: none; width: 100%; margin: 0; padding: 48px 64px; }
	.auth-card > * { width: 100%; max-width: 400px; margin-left: auto; margin-right: auto; }
	.auth-card .back-button { display: none; }
}
</style>