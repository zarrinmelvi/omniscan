<template>
	<ion-page>
		<ion-content class="ion-padding auth-content">
			<div class="auth-card">
				<ion-button fill="clear" class="back-button" @click="$router.back()">
					<ion-icon :icon="chevronBackOutline" slot="icon-only" />
				</ion-button>

				<h1 class="auth-title">Welcome Back</h1>
				<p class="auth-subtitle">Sign in to continue managing your pantry</p>

				<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>

				<form @submit.prevent="handleLogin">
					<ion-item lines="none" class="form-field">
						<ion-label position="stacked">Email Address</ion-label>
						<ion-input v-model="email" type="email" placeholder="your@email.com" required />
					</ion-item>

					<ion-item lines="none" class="form-field">
						<ion-label position="stacked">Password</ion-label>
						<ion-input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Enter your password" required>
							<ion-icon
								slot="end"
								:icon="showPassword ? eyeOffOutline : eyeOutline"
								class="password-toggle"
								@click="showPassword = !showPassword" />
						</ion-input>
					</ion-item>

					<div class="form-row">
						<ion-checkbox v-model="rememberMe" />
						<span class="remember-label">Remember me</span>
						<!-- Not functional yet — no reset-password endpoint exists -->
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
import { IonPage, IonContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonCheckbox } from '@ionic/vue'
import { chevronBackOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/authStore'
import { ApiError } from '@/utils/api'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(false) // visual only — no backend support yet
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
	--background: #f8f9fa;
}
.auth-card {
	max-width: 420px;
	margin: 24px auto;
	background: #ffffff;
	border-radius: 16px;
	padding: 24px;
}
.back-button {
	margin-left: -12px;
}
.auth-title {
	font-size: 1.75rem;
	font-weight: 700;
	margin: 8px 0 4px;
}
.auth-subtitle {
	color: #6b7280;
	margin-bottom: 20px;
}
.form-field {
	--padding-start: 0;
	margin-bottom: 8px;
}
.password-toggle {
	cursor: pointer;
	color: #6b7280;
}
.form-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 12px 0 20px;
	font-size: 0.9rem;
}
.remember-label {
	margin-left: 8px;
	margin-right: auto;
}
.forgot-link {
	color: #16a34a;
	text-decoration: none;
}
.submit-button {
	--background: #16a34a;
	--border-radius: 10px;
	font-weight: 600;
}
.switch-auth {
	text-align: center;
	margin-top: 20px;
	color: #374151;
}
.switch-link {
	color: #16a34a;
	font-weight: 600;
	text-decoration: none;
}
.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 0.85rem;
}
</style>
