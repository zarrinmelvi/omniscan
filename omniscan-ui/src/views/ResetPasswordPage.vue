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
					<span class="brand-label">OmniScan</span>
					<h1 class="auth-title">Set New Password</h1>
					<p class="auth-subtitle">Please enter and confirm your new password.</p>

					<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>
					<div v-if="successMessage" class="form-success">{{ successMessage }}</div>

					<form v-if="!isCompleted" @submit.prevent="handleResetPassword">
						<div class="form-group">
							<label class="input-label">New Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="password"
									:type="showPassword ? 'text' : 'password'"
									placeholder="Enter new password"
									required
									class="custom-input" />
								<ion-icon
									:icon="showPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showPassword = !showPassword" />
							</div>
						</div>

						<!-- Password Requirements Checklist -->
						<div class="password-checklist">
							<div class="check-item" :class="{ valid: passCriteria.length }">
								<ion-icon :icon="passCriteria.length ? checkmarkCircle : closeCircle" />
								<span>At least 8 characters</span>
							</div>
							<div class="check-item" :class="{ valid: passCriteria.upper }">
								<ion-icon :icon="passCriteria.upper ? checkmarkCircle : closeCircle" />
								<span>At least 1 uppercase letter (A-Z)</span>
							</div>
							<div class="check-item" :class="{ valid: passCriteria.lower }">
								<ion-icon :icon="passCriteria.lower ? checkmarkCircle : closeCircle" />
								<span>At least 1 lowercase letter (a-z)</span>
							</div>
							<div class="check-item" :class="{ valid: passCriteria.number }">
								<ion-icon :icon="passCriteria.number ? checkmarkCircle : closeCircle" />
								<span>At least 1 number (0-9)</span>
							</div>
							<div class="check-item" :class="{ valid: passCriteria.special }">
								<ion-icon :icon="passCriteria.special ? checkmarkCircle : closeCircle" />
								<span>At least 1 special character (!@#$%^&*)</span>
							</div>
						</div>

						<div class="form-group margin-top">
							<label class="input-label">Confirm New Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="confirmPassword"
									:type="showPassword ? 'text' : 'password'"
									placeholder="Re-enter new password"
									required
									class="custom-input" />
								<ion-icon
									:icon="showPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showPassword = !showPassword" />
							</div>
						</div>

						<ion-button
							expand="block"
							type="submit"
							class="submit-button"
							:disabled="isSubmitting || !isPasswordValid || password !== confirmPassword">
							<ion-spinner v-if="isSubmitting" name="crescent" class="btn-spinner" />
							<span v-else>Update Password</span>
						</ion-button>
					</form>

					<p v-else class="switch-auth">
						<router-link to="/login" class="switch-link">Proceed to Sign In</router-link>
					</p>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import { eyeOutline, eyeOffOutline, checkmarkCircle, closeCircle } from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

const route = useRoute()
const router = useRouter()

const token = (route.query.token as string) || ''
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const isCompleted = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Password Strictness Checks
const passCriteria = computed(() => {
	const val = password.value
	return {
		length: val.length >= 8,
		upper: /[A-Z]/.test(val),
		lower: /[a-z]/.test(val),
		number: /[0-9]/.test(val),
		special: /[^A-Za-z0-9]/.test(val),
	}
})

const isPasswordValid = computed(() => {
	const c = passCriteria.value
	return c.length && c.upper && c.lower && c.number && c.special
})

async function handleResetPassword() {
	errorMessage.value = null
	successMessage.value = null

	if (!token) {
		errorMessage.value = 'Missing or invalid reset token.'
		return
	}

	if (!isPasswordValid.value) {
		errorMessage.value = 'Please ensure your password meets all safety criteria.'
		return
	}

	if (password.value !== confirmPassword.value) {
		errorMessage.value = 'Passwords do not match.'
		return
	}

	isSubmitting.value = true

	try {
		const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
			method: 'POST',
			body: { token, password: password.value },
			skipAuth: true,
		})

		successMessage.value = res.message
		isCompleted.value = true
		setTimeout(() => {
			router.push('/login')
		}, 2000)
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Failed to reset password.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<style scoped>
.auth-content { --background: #ffffff; }
.auth-layout { width: 100%; }
.auth-brand-panel { display: none; }
.auth-card { max-width: 380px; margin: 0 auto; padding: 24px 24px 32px; background: #ffffff; }
.brand-label { display: block; color: #05c450; font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
.auth-title { font-size: 1.85rem; font-weight: 700; color: #111827; margin: 0 0 6px; letter-spacing: -0.02em; }
.auth-subtitle { color: #6b7280; font-size: 0.85rem; line-height: 1.4; margin: 0 0 20px; }
.form-group { margin-bottom: 12px; }
.margin-top { margin-top: 16px; }
.input-label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
.custom-input-wrapper { position: relative; display: flex; align-items: center; }
.custom-input { width: 100%; height: 46px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 0 14px; font-size: 16px; color: #111827; outline: none; background: #ffffff; }
.custom-input:focus { border-color: #05c450; }
.password-toggle { position: absolute; right: 14px; font-size: 1.1rem; color: #6b7280; cursor: pointer; }

/* Checklist Styling */
.password-checklist { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 10px; padding: 10px 12px; margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.check-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #9ca3af; }
.check-item.valid { color: #16a34a; font-weight: 500; }
.check-item ion-icon { font-size: 0.95rem; }

.submit-button { --background: #05c450; --background-activated: #04ab45; --border-radius: 9999px; --color: #ffffff; font-weight: 600; font-size: 0.95rem; height: 48px; text-transform: none; margin-top: 20px; }
.submit-button[disabled] { opacity: 0.6; }
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
}
</style>