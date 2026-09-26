<template>
	<ion-page>
		<ion-content class="auth-content">
			<div class="auth-card">
				<button type="button" class="back-button" @click="$router.push('/')">
					<ion-icon :icon="chevronBackOutline" />
				</button>

				<span class="brand-label">OmniScan</span>
				<h1 class="auth-title">Welcome Back</h1>
				<p class="auth-subtitle">Sign in to continue managing your pantry</p>

				<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>

				<form @submit.prevent="handleLogin">
					<div class="form-group">
						<label class="input-label">Email Address</label>
						<div class="custom-input-wrapper">
							<input v-model="email" type="email" placeholder="your@email.com" required class="custom-input" />
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
								class="custom-input" />
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
						{{ isSubmitting ? 'Signing in...' : 'Sign In' }}
					</ion-button>
				</form>

				<p class="switch-auth">
					Don't have an account?
					<router-link to="/register" class="switch-link">Get Started</router-link>
				</p>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/vue'
import { chevronBackOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/authStore'
import { ApiError } from '@/utils/api'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

async function handleLogin(): Promise<void> {
	errorMessage.value = null
	isSubmitting.value = true

	try {
		await authStore.login(email.value, password.value)
		window.location.href = '/tabs/home'
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Login failed. Please try again.'
	} finally {
		isSubmitting.value = false
	}
}
</script>

<style scoped>
.auth-content {
	--background: #ffffff;
}

.auth-card {
	max-width: 380px;
	margin: 0 auto;
	padding: 12px 24px 32px;
	background: #ffffff;
}

.back-button {
	background: none;
	border: none;
	font-size: 1.25rem;
	color: #111827;
	padding: 4px 0;
	margin-bottom: 24px;
	cursor: pointer;
	display: flex;
	align-items: center;
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
	font-size: 0.9rem;
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

/* Hide native browser checkbox */
.custom-checkbox-input {
	position: absolute;
	opacity: 0;
	cursor: pointer;
	height: 0;
	width: 0;
}

/* Custom Checkbox Frame */
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

/* Checked State Styling */
.custom-checkbox-input:checked ~ .custom-checkbox-box {
	background-color: #05c450;
	border-color: #05c450;
}

/* White Checkmark Icon */
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
</style>