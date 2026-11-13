<template>
	<ion-page>
		<ion-content class="auth-content" :scroll-y="true">
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
					<!-- Top bar shown ONLY on Step 1 -->
					<template v-if="step === 1">
						<div class="auth-topbar">
							<button type="button" class="back-to-home" @click="handleBack">
								<ion-icon :icon="chevronBackOutline" />
								Back to home
							</button>
						</div>
					</template>
					<!-- Back button shown ONLY on Step 2 -->
					<template v-else>
						<button class="back-button" @click="step = 1">
							<ion-icon :icon="chevronBackOutline" />
						</button>
					</template>

					<div class="progress-bar">
						<div class="progress-segment" :class="{ 'progress-segment--filled': step >= 1 }"></div>
						<div class="progress-segment" :class="{ 'progress-segment--filled': step >= 2 }"></div>
					</div>
					<p v-if="step === 1" class="step-label">Step 1 of 2</p>
					<p v-else class="step-label step-label--accent">Step 2 of 2</p>

					<!-- STEP 1: Create Account -->
					<template v-if="step === 1">
						<span class="brand-label">OmniScan</span>
						<h1 class="auth-title">Create Account</h1>
						<p class="auth-subtitle">Let's get started with your smart pantry</p>

						<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>

						<form @submit.prevent="handleRegister">
							<div class="name-row">
								<div class="form-group">
									<label class="input-label">First name</label>
									<input v-model="firstName" type="text" placeholder="First name" maxlength="16" class="custom-input" :class="{ 'input-error': fieldErrors.firstName }" @input="clearFieldError('firstName')" />
								</div>
								<div class="form-group">
									<label class="input-label">Last name</label>
									<input v-model="lastName" type="text" placeholder="Last name" maxlength="25" class="custom-input" :class="{ 'input-error': fieldErrors.lastName }" @input="clearFieldError('lastName')" />
								</div>
							</div>

							<div class="form-group">
								<label class="input-label">Username</label>
								<div class="custom-input-wrapper">
							<input
								v-model="username"
								type="text"
								placeholder="Choose a username"
								minlength="4"
								maxlength="15"
								class="custom-input"
								:class="{ 
									'input-error': fieldErrors.username || (usernameValidation.isAvailable === false && username.trim()),
									'input-success': usernameValidation.isAvailable === true && username.trim()
								}"
								@input="handleUsernameInput" />
							<ion-spinner v-if="usernameValidation.isChecking" name="crescent" class="username-spinner" />
								</div>
							<div v-if="username.trim() && usernameValidation.message" class="username-feedback" :class="{
								'username-feedback--checking': usernameValidation.isChecking,
								'username-feedback--success': usernameValidation.isAvailable === true,
								'username-feedback--error': usernameValidation.isAvailable === false
							}">
								{{ usernameValidation.message }}
							</div>
							</div>

							<div class="name-row margin-top">
							<div class="form-group">
								<label class="input-label">Gender</label>
								<select 
									v-model="gender" 
									class="custom-input custom-select"
									:class="{ 'input-error': fieldErrors.gender }"
									@change="clearFieldError('gender')">
									<option value="" disabled>Select gender</option>
									<option value="Male">Male</option>
									<option value="Female">Female</option>
									<option value="Other">Other</option>
									<option value="Prefer not to say">Prefer not to say</option>
								</select>
							</div>

							<div class="form-group">
								<label class="input-label">Birthday</label>
								<AppDatePicker
									v-model="birthday"
									:min="BIRTHDAY_MIN"
									:max="maxBirthdayDate"
									placeholder="Select your birthday"
									aria-label="Birthday"
									class="custom-input"
									:class="{ 'input-error': fieldErrors.birthday || ageError }"
									@change="clearFieldError('birthday')" />
								<div v-if="ageError" class="field-error-text">{{ ageError }}</div>
							</div>
							</div>

							<div class="form-group margin-top">
								<label class="input-label">Email Address</label>
								<div class="custom-input-wrapper">
									<input
										v-model="email"
										type="text"
										placeholder="your@email.com"
										maxlength="31"
										class="custom-input"
										:class="{ 'input-error': fieldErrors.email }"
										:disabled="isGooglePending"
										@input="clearFieldError('email')" />
								</div>
								<p v-if="!isGooglePending" class="verify-disclaimer switch-auth">Verify your email within 7 days or your account will be automatically deleted.</p>
							</div>

							<div v-if="!isGooglePending" class="form-group">
								<label class="input-label">Password</label>
								<div class="custom-input-wrapper">
									<input
										v-model="password"
										:type="showPassword ? 'text' : 'password'"
										placeholder="Create a password"
										maxlength="30"
										class="custom-input has-toggle"
										:class="{ 'input-error': fieldErrors.password }"
										@input="clearFieldError('password')" />
									<ion-icon
										:icon="showPassword ? eyeOffOutline : eyeOutline"
										class="password-toggle"
										@click="showPassword = !showPassword" />
								</div>
							</div>

							<div v-if="!isGooglePending" class="pass-criteria-grid">
								<div class="criteria-item" :class="{ valid: passCriteria.length }">
									<ion-icon :icon="passCriteria.length ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
									At least 8 characters
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.upper }">
									<ion-icon :icon="passCriteria.upper ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
									1 uppercase letter (A-Z)
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.lower }">
									<ion-icon :icon="passCriteria.lower ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
									1 lowercase letter (a-z)
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.number }">
									<ion-icon :icon="passCriteria.number ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
									1 number (0-9)
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.special }">
									<ion-icon :icon="passCriteria.special ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
									1 special character (!@#$%^&*)
								</div>
							</div>

							<div v-if="!isGooglePending" class="form-group margin-top">
								<label class="input-label">Confirm Password</label>
								<div class="custom-input-wrapper">
									<input
										v-model="confirmPassword"
										:type="showConfirmPassword ? 'text' : 'password'"
										placeholder="Re-enter your password"
										maxlength="30"
										class="custom-input has-toggle"
										:class="{ 'input-error': fieldErrors.confirmPassword }"
										@input="clearFieldError('confirmPassword')" />
									<ion-icon
										:icon="showConfirmPassword ? eyeOffOutline : eyeOutline"
										class="password-toggle"
										@click="showConfirmPassword = !showConfirmPassword" />
								</div>
							</div>

							<div v-if="isGooglePending" class="google-password-message">
								<ion-icon :icon="informationCircleOutline" />
								<span>Password not required for Google accounts</span>
							</div>

							<ion-button
								expand="block"
								type="submit"
								class="submit-button"
							:disabled="isSubmitting">
								<ion-spinner v-if="isSubmitting" name="crescent" class="btn-spinner" />
								<span v-else>Continue</span>
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
								Sign up with Google
							</template>
						</button>

						<p class="switch-auth">
							Already have an account?
							<router-link to="/login" class="switch-link">Sign In</router-link>
						</p>
					</template>

					<!-- STEP 2: Allergens / Dietary Preferences -->
					<template v-else>
						<span class="brand-label">{{ route.query.step === '2' ? 'Email Verified!' : 'Almost There!' }}</span>
						<h1 class="auth-title">Your allergens</h1>
						<p class="auth-subtitle">Choose up to 5. We flag them on every scan. You can change them later in your profile.</p>

						<div v-if="isLoadingAllergens" class="state-block">
							<ion-spinner name="crescent" />
						</div>

						<div v-else-if="allergensLoadError" class="inline-error">
							<ion-icon :icon="alertCircleOutline" color="danger" />
							<span>{{ allergensLoadError }}</span>
							<ion-button size="small" fill="clear" @click="fetchAllergenCatalog">Retry</ion-button>
						</div>

						<template v-else>
							<div class="allergen-counter-row">
								<span class="allergen-count-text">{{ allergenCount }} of 5 selected</span>
								<div class="allergen-dots">
									<span v-for="i in 5" :key="i" class="allergen-dot" :class="{ 'allergen-dot--filled': i <= allergenCount }"></span>
								</div>
							</div>

							<div class="allergen-chip-grid">
								<button
									v-for="allergen in allergenCatalog"
									:key="allergen.id"
									type="button"
									class="allergen-chip"
									:class="{ 'allergen-chip--selected': selectedAllergenIds.includes(allergen.id) }"
									@click="toggleAllergen(allergen.id)">
									<ion-icon v-if="selectedAllergenIds.includes(allergen.id)" :icon="checkmarkCircle" class="chip-check-icon" />
									{{ formatAllergenName(allergen.name) }}
								</button>
							</div>

							<div v-if="allergenCount >= 5" class="allergen-limit-banner">
								You've reached the limit of 5. Remove one to choose another.
							</div>

							<div class="halal-toggle-card">
								<div class="halal-toggle-text">
									<p class="halal-toggle-label">Halal only</p>
									<p class="halal-toggle-sub">Flag products without a verified Halal logo. This is a dietary preference, not an allergen.</p>
								</div>
								<ion-toggle v-model="halalSelected" class="custom-toggle" />
							</div>
						</template>

						<div v-if="prefsError" class="form-error">{{ prefsError }}</div>
						<div v-if="setupError" class="form-error">{{ setupError }}</div>

						<ion-button expand="block" class="submit-button" :disabled="isSavingPrefs || !hasValidSelection" @click="completeSetup">
							<ion-spinner v-if="isSavingPrefs" name="crescent" class="btn-spinner" />
							<span v-else>Finish</span>
						</ion-button>
					</template>
				</div>
			</div>
		</ion-content>

		<!-- Terms & Conditions Sheet Modal -->
		<ion-modal :is-open="isTermsOpen" @didDismiss="isTermsOpen = false" class="terms-sheet-modal">
			<ion-header class="ion-no-border terms-modal-header">
				<div class="terms-modal-header-flex">
					<h2 class="terms-modal-title">Terms &amp; Conditions</h2>
				</div>
			</ion-header>
			<ion-content class="terms-modal-content" ref="termsContentRef" :scroll-events="true" @ionScroll="onTermsScroll">
				<div class="terms-modal-body">
					<p style="font-size: 0.75rem; color: #6b7280; font-weight: 600; margin-bottom: 16px;">Last Updated: November 12, 2026</p>

					<p v-for="(para, pi) in termsIntro" :key="'ti-' + pi">{{ para }}</p>

					<template v-for="section in termsSections" :key="section.title">
						<h4>{{ section.title }}</h4>
						<template v-for="(block, bi) in section.blocks" :key="bi">
							<p v-if="block.type === 'p'">{{ block.text }}</p>
							<p v-else-if="block.type === 'strong'"><strong>{{ block.text }}</strong></p>
							<ul v-else>
								<li v-for="(item, ii) in block.items" :key="ii">{{ item }}</li>
							</ul>
						</template>
					</template>

					<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
						<p style="font-weight: 600; margin-bottom: 4px; font-size: 0.9rem;">OmniScan</p>
						<p style="font-size: 0.8rem; color: #6b7280; margin-bottom: 2px;">A Cross-Platform Pantry Manager with Computer Vision for Allergen and Halal Detection and Artificial Intelligence Recommendations</p>
						<p style="font-size: 0.8rem; color: #6b7280; margin-bottom: 2px;">Developed as a Capstone Project</p>
						<p style="font-size: 0.8rem; color: #6b7280; margin-bottom: 2px;">STI College San Jose Del Monte</p>
						<p style="font-size: 0.8rem; color: #6b7280;">Bachelor of Science in Information Technology</p>
					</div>
				</div>
			</ion-content>
			<ion-footer class="ion-no-border terms-modal-footer">
				<div v-if="!termsScrolledToBottom" class="terms-scroll-prompt">
					<button class="terms-scroll-link" @click="scrollTermsToBottom">
						↓ Scroll to Bottom
					</button>
				</div>
				<div class="terms-action-row">
					<ion-button expand="block" class="terms-agree-btn" :disabled="!termsScrolledToBottom" @click="acceptTerms">
						I Agree
					</ion-button>
					<ion-button expand="block" fill="outline" class="terms-disagree-btn" @click="disagreeTerms">
						I Disagree
					</ion-button>
				</div>
			</ion-footer>
		</ion-modal>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner, IonModal, IonHeader, IonFooter, IonToggle, toastController } from '@ionic/vue'
import { chevronBackOutline, eyeOutline, eyeOffOutline, alertCircleOutline, arrowDownOutline, informationCircleOutline, checkmarkCircle, ellipseOutline } from 'ionicons/icons'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, ApiError, API_BASE_URL } from '@/utils/api'
import { termsIntro, termsSections } from '@/data/termsContent'
import AppDatePicker from '@/components/AppDatePicker.vue'
import { BIRTHDAY_MIN, todayLocalISO, toISODate, ageFromISO } from '@/utils/dateUtils'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

function decodeJwtPayload<T = Record<string, unknown>>(token: string): T {
	const part = token.split('.')[1]
	if (!part) throw new Error('Malformed token')
	const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
	const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
	return JSON.parse(new TextDecoder().decode(bytes)) as T
}

const PREF_MAX = 5
const step = ref<1 | 2>(route.query.step === '2' ? 2 : 1)
const isGoogleSubmitting = ref(false)

async function showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
	const toast = await toastController.create({
		message,
		duration: 3500,
		color,
		position: 'top',
	})
	await toast.present()
}

async function handleGoogleSignIn(): Promise<void> {
	if (isGoogleSubmitting.value) return
	const isNative = Capacitor.isNativePlatform()

	if (isNative) {
		isGoogleSubmitting.value = true
		try {
			await GoogleSignIn.initialize({
				clientId: '394571296954-2nkqagdbfjujgdei1aoiq78fg3p9i7nv.apps.googleusercontent.com',
			})

			const result = await GoogleSignIn.signIn()
			const idToken = result.idToken

			if (!idToken) {
				throw new Error('No ID Token returned from Google Sign-In')
			}

			const verifyResponse = await apiFetch<{
				success: boolean
				token?: string
				pendingToken?: string
				requiresRegistration: boolean
			}>('/api/auth/google/verify', {
				method: 'POST',
				body: { idToken, intent: 'register' },
				skipAuth: true,
			})

			if (verifyResponse.requiresRegistration && verifyResponse.pendingToken) {
				// New user - pre-fill form
				const payload = decodeJwtPayload<any>(verifyResponse.pendingToken)
				const suggestedUsername = payload.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'user'

				authStore.setPendingGoogleData({
					email: payload.email,
					firstName: payload.firstName,
					lastName: payload.lastName,
					googleId: payload.googleId,
					username: suggestedUsername,
					pendingToken: verifyResponse.pendingToken,
				})

				isGooglePending.value = true
				firstName.value = payload.firstName
				lastName.value = payload.lastName
				email.value = payload.email
				username.value = suggestedUsername

				await checkUsernameAvailability(suggestedUsername)
			} else if (verifyResponse.token) {
				// skipCheck=true: don't call checkAuth here — it can fail on native
				// before the HTTP layer is ready and wipe the token.
				await authStore.loginWithOAuthToken(verifyResponse.token, true)
				window.location.replace('/tabs/home')
			}
		} catch (error: any) {
			console.error('Native Google Sign-In failed:', error)
			if (error instanceof ApiError && error.status === 409) {
				handleGoogleAccountExists()
				return
			}
			isGooglePending.value = false
			const errMsg = error?.message || 'Google sign-in failed. Please try again.'
			void showToast(errMsg, 'danger')
		} finally {
			isGoogleSubmitting.value = false
		}
	} else {
		window.location.href = `${API_BASE_URL}/api/auth/google?state=register`
	}
}

// Google sign-up hit an existing account: no token stored, stay on /register.
function handleGoogleAccountExists(): void {
	authStore.clearPendingGoogleData()
	isGooglePending.value = false
	void showToast('Account already exist', 'danger')
}

watch(
	() => route.query.step,
	async (newStep) => {
		if (newStep === '2') {
			step.value = 2
			await authStore.checkAuth()
			fetchAllergenCatalog()
		}
	}
)

const firstName = ref('')
const lastName = ref('')
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const gender = ref('')
const birthday = ref('')
const isGooglePending = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const isTermsOpen = ref(false)
const errorMessage = ref<string | null>(null)

// Username validation state
const usernameValidation = ref<{
	isChecking: boolean
	isAvailable: boolean | null
	message: string
	lastChecked: string
}>({
	isChecking: false,
	isAvailable: null,
	message: '',
	lastChecked: ''
})

let usernameCheckTimeout: ReturnType<typeof setTimeout> | null = null

const termsContentRef = ref<any>(null)
const termsScrolledToBottom = ref(false)

function onTermsScroll(ev: CustomEvent): void {
	const detail = ev.detail as { scrollTop: number }
	const el = ev.target as any
	const scrollEl = el?.scrollEl || el
	if (!scrollEl) return
	const reached = detail.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 24
	if (reached) termsScrolledToBottom.value = true
}

async function scrollTermsToBottom(): Promise<void> {
	const content = termsContentRef.value?.$el ?? termsContentRef.value
	if (content && typeof content.getScrollElement === 'function') {
		await content.getScrollElement()
		await content.scrollToBottom(300)
		setTimeout(() => { termsScrolledToBottom.value = true }, 350)
	} else {
		termsScrolledToBottom.value = true
	}
}

watch(isTermsOpen, async (open) => {
	if (open) {
		termsScrolledToBottom.value = false
		await nextTick()
		setTimeout(async () => {
			const content = termsContentRef.value?.$el ?? termsContentRef.value
			if (content && typeof content.getScrollElement === 'function') {
				const scrollEl = await content.getScrollElement()
				if (scrollEl.scrollHeight <= scrollEl.clientHeight + 24) {
					termsScrolledToBottom.value = true
				}
			}
		}, 300)
	}
})

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
	return c.length && c.upper && c.lower && c.number && c.special && password.value.length <= 30
})

// Picker upper bound is today (local time); the under-16 rule is a validation error below.
const maxBirthdayDate = computed(() => todayLocalISO())

const ageError = computed(() => {
	if (!birthday.value) return ''
	const iso = toISODate(birthday.value)
	if (!iso || iso < BIRTHDAY_MIN || iso > maxBirthdayDate.value) return 'Please enter a valid birthday'
	return ageFromISO(iso) < 16 ? 'You must be at least 16 years old to register' : ''
})

const isBirthdayValid = computed(() => birthday.value && !ageError.value)

const fieldErrors = reactive({
	firstName: false,
	lastName: false,
	username: false,
	email: false,
	password: false,
	confirmPassword: false,
	gender: false,
	birthday: false,
})

function clearFieldError(field: keyof typeof fieldErrors) {
	fieldErrors[field] = false
}

function handleUsernameInput() {
	clearFieldError('username')
	checkUsernameAvailability(username.value)
}

// Debounced username availability check
async function checkUsernameAvailability(value: string) {
	const trimmedUsername = value.trim()
	
	// Clear previous timeout
	if (usernameCheckTimeout) {
		clearTimeout(usernameCheckTimeout)
	}
	
	// Reset validation state if empty
	if (!trimmedUsername) {
		usernameValidation.value = {
			isChecking: false,
			isAvailable: null,
			message: '',
			lastChecked: ''
		}
		return
	}
	
	// Check if already checked this username
	if (usernameValidation.value.lastChecked === trimmedUsername && usernameValidation.value.isAvailable !== null) {
		return
	}
	
	// Set checking state immediately
	usernameValidation.value.isChecking = true
	usernameValidation.value.message = 'Checking availability...'
	
	// Debounce the actual API call
	usernameCheckTimeout = setTimeout(async () => {
		try {
			const response = await apiFetch<{
				available: boolean
				message: string
				isFormatError: boolean
			}>('/api/auth/check-username', {
				method: 'POST',
				body: { username: trimmedUsername },
				skipAuth: true,
			})
			
			usernameValidation.value = {
				isChecking: false,
				isAvailable: response.available,
				message: response.message,
				lastChecked: trimmedUsername
			}
		} catch (error: any) {
			usernameValidation.value = {
				isChecking: false,
				isAvailable: false,
				message: error?.message || 'Could not check username availability',
				lastChecked: trimmedUsername
			}
		}
	}, 500) // 500ms debounce
}

const ALLOWED_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com']

function isAllowedEmailDomain(emailStr: string): boolean {
	if (!emailStr || !emailStr.includes('@')) return false
	const domain = emailStr.split('@').pop()?.toLowerCase()
	return domain ? ALLOWED_DOMAINS.includes(domain) : false
}

const KNOWN_TLDS =
	'com|org|net|edu|gov|mil|int|info|biz|name|pro|' +
	'app|dev|io|ai|co|me|tv|cc|online|store|' +
	'us|uk|ca|au|de|fr|jp|cn|br|in|mx|ph|sg|nz|za|' +
	'ng|ke|pk|bd|id|my|th|vn|' +
	'es|it|nl|pl|se|no|fi|dk|be|ch|at|ru|tr|' +
	'sa|ae|eg|il|ar|cl|pe|ve'
const EMAIL_RE = new RegExp(`^[^\\s@]+@[^\\s@]+(\\.[^\\s@]+)*\\.(${KNOWN_TLDS})$`, 'i')

interface Allergen {
	id: number
	name: string
	scientific_name: string
	is_predefined?: boolean
}

const allergenCatalog = ref<Allergen[]>([])
const selectedAllergenIds = ref<number[]>([])
const halalSelected = ref(false)
const isLoadingAllergens = ref(false)
const allergensLoadError = ref('')
const isSavingPrefs = ref(false)
const prefsError = ref('')
const setupError = ref('')
const prefLimitWarning = ref(false)

const allergenCount = computed(() => selectedAllergenIds.value.length)

const hasValidSelection = computed(() => {
	return selectedAllergenIds.value.length > 0 || halalSelected.value
})

function formatAllergenName(name: string): string {
	return name.replace(/\b\w/g, (char) => char.toUpperCase())
}

async function handleBack(): Promise<void> {
	// Clear any pending Google sign-up data so it doesn't pre-fill the form
	// if the user starts a new Google sign-up flow after going back.
	authStore.clearPendingGoogleData()
	// Also clear the local form refs so the fields are visually empty
	// when the user returns to this page.
	firstName.value = ''
	lastName.value = ''
	email.value = ''
	username.value = ''
	isGooglePending.value = false
	// On native, stay within the WebView to preserve the native bridge.
	const { Capacitor } = await import('@capacitor/core')
	if (Capacitor.isNativePlatform()) {
		router.replace('/')
	} else {
		window.location.href = 'https://omniscan.website'
	}
}

async function redirectIfAlreadyAuthenticated(): Promise<boolean> {
	// If there is pending Google data in the store, the user just came back
	// from the Google account picker — do NOT call checkAuth() here. Calling
	// checkAuth fires GET /api/auth/me with no valid session, gets a 401, and
	// handleUnauthorized navigates away, losing the pending registration data.
	if (authStore.pendingGoogleData) return false

	await authStore.checkAuth()
	if (authStore.isAuthenticated) {
		step.value = 2
		fetchAllergenCatalog()
		if (route.query.step !== '2') {
			router.replace({ path: '/register', query: { step: '2' } })
		}
		return true
	}
	return false
}

async function revealError() {
	await nextTick()
	document.querySelector('.auth-card .form-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function handleRegister(): Promise<void> {
	errorMessage.value = null
	fieldErrors.firstName = false
	fieldErrors.lastName = false
	fieldErrors.username = false
	fieldErrors.email = false
	fieldErrors.password = false
	fieldErrors.confirmPassword = false
	fieldErrors.gender = false
	fieldErrors.birthday = false

	let hasEmptyField = false
	if (!firstName.value.trim()) { fieldErrors.firstName = true; hasEmptyField = true }
	if (!lastName.value.trim()) { fieldErrors.lastName = true; hasEmptyField = true }
	if (!username.value.trim()) { fieldErrors.username = true; hasEmptyField = true }
	if (!email.value.trim()) { fieldErrors.email = true; hasEmptyField = true }
	
	// Only validate password if not Google sign-up
	if (!isGooglePending.value) {
		if (!password.value) { fieldErrors.password = true; hasEmptyField = true }
		if (!confirmPassword.value) { fieldErrors.confirmPassword = true; hasEmptyField = true }
	}
	
	// Always validate gender and birthday
	if (!gender.value) { fieldErrors.gender = true; hasEmptyField = true }
	if (!birthday.value) { fieldErrors.birthday = true; hasEmptyField = true }
	
	if (hasEmptyField) {
		const onlyGenderBirthdayMissing =
			!fieldErrors.firstName && !fieldErrors.lastName && !fieldErrors.username &&
			!fieldErrors.email && !fieldErrors.password && !fieldErrors.confirmPassword
		if (onlyGenderBirthdayMissing && fieldErrors.gender && fieldErrors.birthday) {
			errorMessage.value = 'Please select your gender and birthday.'
		} else if (onlyGenderBirthdayMissing && fieldErrors.gender) {
			errorMessage.value = 'Please select your gender.'
		} else if (onlyGenderBirthdayMissing && fieldErrors.birthday) {
			errorMessage.value = 'Please enter your birthday.'
		} else {
			errorMessage.value = 'Please fill in all required fields.'
		}
		void revealError()
		return
	}

	const USERNAME_RE = /^[a-zA-Z0-9_]{4,15}$/
	if (!USERNAME_RE.test(username.value.trim())) {
		fieldErrors.username = true
		errorMessage.value = 'Username must be 4–15 characters, letters, numbers, and underscores only.'
		void revealError()
		return
	}

	// Username availability
	if (usernameValidation.value.isAvailable === null && !usernameValidation.value.isChecking) {
		void checkUsernameAvailability(username.value)
	}
	if (usernameValidation.value.isChecking) {
		fieldErrors.username = true
		errorMessage.value = 'Still checking if that username is available. Please wait a moment and try again.'
		void revealError()
		return
	}
	if (usernameValidation.value.isAvailable !== true) {
		fieldErrors.username = true
		errorMessage.value =
			usernameValidation.value.message && usernameValidation.value.isAvailable === false
				? usernameValidation.value.message
				: 'Please choose a different username.'
		void revealError()
		return
	}

	if (!isGooglePending.value && email.value.length > 31) {
		fieldErrors.email = true
		errorMessage.value = 'Email must be 31 characters or less.'
		void revealError()
		return
	}

	if (!EMAIL_RE.test(email.value) || !isAllowedEmailDomain(email.value)) {
		fieldErrors.email = true
		errorMessage.value = 'Only @gmail.com, @outlook.com, @hotmail.com, and @yahoo.com emails are accepted.'
		void revealError()
		return
	}

	// Only validate password if not Google sign-up
	if (!isGooglePending.value) {
		if (!isPasswordValid.value) {
			fieldErrors.password = true
			errorMessage.value = 'Please ensure your password meets all safety criteria.'
			void revealError()
			return
		}

		if (password.value !== confirmPassword.value) {
			fieldErrors.password = true
			fieldErrors.confirmPassword = true
			errorMessage.value = 'Passwords do not match.'
			void revealError()
			return
		}
	}

	// Validate birthday age
	if (ageError.value) {
		fieldErrors.birthday = true
		errorMessage.value = ageError.value
		void revealError()
		return
	}

	isTermsOpen.value = true
}

async function acceptTerms(): Promise<void> {
	isTermsOpen.value = false

	if (isGooglePending.value) {
		await completeGoogleRegistration()
	} else {
		await submitPasswordRegistration()
	}
}

async function completeGoogleRegistration(): Promise<void> {
	isSubmitting.value = true
	try {
		await authStore.createGoogleAccount(
			username.value.trim(),
			gender.value,
			birthday.value
		)

		step.value = 2
		fetchAllergenCatalog()
		router.replace({ path: '/register', query: { step: '2' } })
	} catch (err: any) {
		errorMessage.value = err?.message || 'Failed to create account. Please try again.'
	} finally {
		isSubmitting.value = false
	}
}

async function submitPasswordRegistration(): Promise<void> {
	if (await redirectIfAlreadyAuthenticated()) {
		return
	}

	isSubmitting.value = true
	try {
		const response = await authStore.register(
			firstName.value.trim(),
			lastName.value.trim(),
			username.value.trim(),
			email.value,
			password.value,
			gender.value,
			birthday.value
		)

		if (response.requiresVerification) {
			router.push({ path: '/check-email', query: { email: email.value } })
			return
		}

		await authStore.login(email.value, password.value)
		await showToast('Account created successfully!', 'success')
		step.value = 2
		fetchAllergenCatalog()
	} catch (err) {
		if (err instanceof ApiError) {
			if (err.status === 429) {
				router.push({ path: '/check-email', query: { email: email.value } })
			} else {
				errorMessage.value = err.message
				if (err.message.toLowerCase().includes('email')) {
					fieldErrors.email = true
				}
			}
		} else {
			errorMessage.value = 'Registration failed. Please try again.'
		}
	} finally {
		isSubmitting.value = false
	}
}

function disagreeTerms(): void {
	// Just close the T&C modal. Do NOT clear the form or sign out — the user
	// disagreed with the T&C but may still want to review their info or try
	// again. Fields are only cleared when they explicitly go back to the
	// Welcome page via the back button (handleBack).
	isTermsOpen.value = false
}

async function handleGoogleSignUpCancellation(): Promise<void> {
	try {
		const isNative = Capacitor.isNativePlatform()
		if (isNative) {
			await GoogleSignIn.signOut()
		}
		// For web, Google session expires naturally

		authStore.clearPendingGoogleData()

		// Clear all form fields
		firstName.value = ''
		lastName.value = ''
		username.value = ''
		email.value = ''
		gender.value = ''
		birthday.value = ''
		password.value = ''
		confirmPassword.value = ''

		isGooglePending.value = false

		await showToast('Google sign-up cancelled', 'warning')
	} catch (err) {
		console.error('Error cancelling Google sign-up:', err)
	}
}

async function fetchAllergenCatalog(): Promise<void> {
	isLoadingAllergens.value = true
	allergensLoadError.value = ''

	try {
		const rawCatalog = await apiFetch<Allergen[]>('/api/allergen', { method: 'GET' })
		allergenCatalog.value = rawCatalog.filter((a) => a.is_predefined)
	} catch (err) {
		allergensLoadError.value = err instanceof ApiError ? err.message : 'Could not load allergen options.'
	} finally {
		isLoadingAllergens.value = false
	}
}

function toggleAllergen(id: number): void {
	if (selectedAllergenIds.value.includes(id)) {
		selectedAllergenIds.value = selectedAllergenIds.value.filter((existingId) => existingId !== id)
		prefLimitWarning.value = false
	} else {
		if (allergenCount.value >= PREF_MAX) {
			prefLimitWarning.value = true
			void showToast('Maximum of 5 allergens allowed.', 'warning')
			return
		}
		selectedAllergenIds.value.push(id)
	}
}

async function completeSetup(): Promise<void> {
	if (isSavingPrefs.value) return

	isSavingPrefs.value = true
	prefsError.value = ''
	setupError.value = ''

	await authStore.checkAuth()
	if (!authStore.isAuthenticated) {
		prefsError.value = 'Your verification session expired. Please sign in to continue.'
		setTimeout(() => {
			router.push('/login')
		}, 1500)
		isSavingPrefs.value = false
		return
	}

	const customPrefTags = allergenCatalog.value
		.filter((a) => selectedAllergenIds.value.includes(a.id))
		.map((a) => `${formatAllergenName(a.name)}-free`)

	try {
		await apiFetch('/api/users', {
			method: 'PUT',
			body: {
				halal_pref: halalSelected.value,
				allergen_ids: selectedAllergenIds.value,
				custom_preferences: customPrefTags,
			},
		})
		// On native use replace to stay within the WebView.
		const { Capacitor } = await import('@capacitor/core')
		if (Capacitor.isNativePlatform()) {
			window.location.replace('/tabs/home')
		} else {
			window.location.href = '/tabs/home'
		}
	} catch (err) {
		prefsError.value = err instanceof ApiError ? err.message : 'Failed to save your preferences.'
	} finally {
		isSavingPrefs.value = false
	}
}

function onWindowFocus(): void {
	// Do not trigger checkAuth when the window regains focus if there is pending
	// Google data — the Google account picker returning to the app fires this,
	// which would call checkAuth, 401, and navigate away before the sign-in
	// flow completes.
	if (step.value === 1 && !authStore.pendingGoogleData) {
		redirectIfAlreadyAuthenticated()
	}
}

onMounted(async () => {
	if (route.query.oauth_error === 'account_exists') {
		handleGoogleAccountExists()
		router.replace({ path: '/register', query: {} })
	}

	// If LoginPage already set pendingGoogleData in the store (native Google
	// sign-in on the Login screen for a new account), pre-fill the form from
	// the store directly — no query string needed.
	if (authStore.pendingGoogleData && !route.query.oauth_pending) {
		const pending = authStore.pendingGoogleData
		isGooglePending.value = true
		firstName.value = pending.firstName
		lastName.value = pending.lastName
		email.value = pending.email
		username.value = pending.username
		await checkUsernameAvailability(pending.username)
	}

	// Check for oauth_pending token from Google OAuth (web flow)
	const pendingToken = route.query.oauth_pending as string
	if (pendingToken) {
		try {
			const payload = decodeJwtPayload<any>(pendingToken)
			if (payload.type !== 'google_pending') throw new Error('Invalid token')

			if (payload.exp && payload.exp * 1000 < Date.now()) {
				isGooglePending.value = false
				await showToast('Google sign-up session expired. Please try again.', 'danger')
			} else {
				const suggestedUsername = payload.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'user'
				authStore.setPendingGoogleData({
					email: payload.email,
					firstName: payload.firstName,
					lastName: payload.lastName,
					googleId: payload.googleId,
					username: suggestedUsername,
					pendingToken,
				})

				isGooglePending.value = true
				firstName.value = payload.firstName
				lastName.value = payload.lastName
				email.value = payload.email
				username.value = suggestedUsername

				await checkUsernameAvailability(suggestedUsername)
				router.replace({ path: '/register', query: {} })
			}
		} catch (err) {
			console.error('Failed to load Google pending token:', err)
			isGooglePending.value = false
			const isTokenProblem = err instanceof Error && (err.message === 'Invalid token' || err.message === 'Malformed token')
				|| err instanceof SyntaxError
				|| (typeof DOMException !== 'undefined' && err instanceof DOMException)
			await showToast(
				isTokenProblem
					? 'Google sign-up session expired. Please try again.'
					: "Couldn't load your Google details. Please try again.",
				'danger'
			)
		}
	}

	if (step.value === 2) {
		await authStore.checkAuth()
		fetchAllergenCatalog()
		return
	}
	await redirectIfAlreadyAuthenticated()
	window.addEventListener('focus', onWindowFocus)
	document.addEventListener('visibilitychange', onWindowFocus)
})

onUnmounted(() => {
	window.removeEventListener('focus', onWindowFocus)
	document.removeEventListener('visibilitychange', onWindowFocus)
})
</script>

<style scoped>
/* Also carries .switch-auth so it inherits that class's existing dark colour (#94a3b8);
   the Register dark-rule snapshot forbids adding a new dark rule here. */
.verify-disclaimer.switch-auth {
	margin: 6px 0 0;
	font-size: 0.78rem;
	line-height: 1.4;
	text-align: left;
	color: #6b7280;
}

.auth-content {
	--background: #ffffff;
	--overflow: auto;
}

.auth-content::part(scroll) {
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.auth-content::part(scroll)::-webkit-scrollbar {
	display: none;
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
	padding: 12px 24px 140px;
	padding-top: calc(12px + env(safe-area-inset-top));
	background: #ffffff;
	min-height: 100%;
}

.back-button {
	background: none;
	border: none;
	font-size: 1.25rem;
	color: #111827;
	padding: 4px 0;
	margin-bottom: 8px;
	cursor: pointer;
	display: flex;
	align-items: center;
}

.auth-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.back-to-home { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-size: 0.85rem; color: #6b7280; padding: 0; }

.progress-bar {
	display: flex;
	gap: 6px;
	margin-bottom: 6px;
}

.progress-segment {
	flex: 1;
	height: 4px;
	background: #e5e7eb;
	border-radius: 9999px;
}

.progress-segment--filled {
	background: #05c450;
}

.step-label {
	font-size: 0.75rem;
	color: #6b7280;
	margin: 0 0 24px;
}

.step-label--accent {
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

.margin-top {
	margin-top: 16px;
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

.custom-input.input-error {
	border-color: #ef4444 !important;
}

.custom-input.input-success {
	border-color: #15803d !important;
}

.username-spinner {
	position: absolute;
	right: 14px;
	width: 18px;
	height: 18px;
	color: #6b7280;
}

.username-feedback {
	font-size: 0.8rem;
	margin-top: 6px;
	padding: 6px 10px;
	border-radius: 6px;
	line-height: 1.3;
}

.username-feedback--checking {
	color: #6b7280;
	background: #f3f4f6;
}

.username-feedback--success {
	color: #15803d;
	background: #f0fdf4;
	border: 1px solid #bbf7d0;
}

.username-feedback--error {
	color: #b91c1c;
	background: #fee2e2;
	border: 1px solid #fecaca;
}


.custom-select,
.app-date-picker.custom-input {
	color: #111827;
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

.name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 0; }
.custom-input.has-toggle { padding-right: 44px; }

.pass-criteria-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-top: 10px; padding: 12px 14px; background: #f9fafb; border-radius: 10px; margin-bottom: 14px; }
.criteria-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #9ca3af; }
.criteria-item.valid { color: #15803d; }
.criteria-icon { width: 16px; height: 16px; flex-shrink: 0; color: #d1d5db; }
.criteria-item.valid .criteria-icon { color: #15803d; }

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
	margin-top: 24px;
}

.submit-button[disabled] {
	opacity: 0.6;
}

.btn-spinner {
	width: 20px;
	height: 20px;
}

.switch-auth {
	text-align: center;
	margin-top: 20px;
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
	margin-bottom: 12px;
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

.inline-error {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 0;
	color: var(--ion-color-danger);
	font-size: 0.85rem;
}

.state-block {
	display: flex;
	justify-content: center;
	padding: 24px 0;
}

.allergen-counter-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.allergen-count-text { font-size: 0.85rem; color: #374151; font-weight: 500; }
.allergen-dots { display: flex; gap: 6px; }
.allergen-dot { width: 10px; height: 10px; border-radius: 50%; background: #d1d5db; }
.allergen-dot--filled { background: #15803d; }
.allergen-chip-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.allergen-chip { display: inline-flex; align-items: center; gap: 5px; padding: 8px 16px; border-radius: 9999px; border: 1.5px solid #d1d5db; background: transparent; color: #374151; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.allergen-chip:hover:not(.allergen-chip--selected) { border-color: #15803d; color: #15803d; }
.allergen-chip--selected { background: #15803d; border-color: #15803d; color: #fff; font-weight: 600; }
.chip-check-icon { font-size: 16px; margin-right: -2px; }
.allergen-limit-banner { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 10px; padding: 10px 14px; font-size: 0.82rem; margin-bottom: 14px; }

.halal-toggle-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.halal-toggle-text { flex: 1; }
.halal-toggle-label { font-size: 0.9rem; font-weight: 600; color: #111827; margin: 0 0 2px; }
.halal-toggle-sub { font-size: 0.78rem; color: #6b7280; margin: 0; line-height: 1.4; }


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

.brand-features { list-style: none; padding: 0; margin: 28px 0 0; display: flex; flex-direction: column; gap: 16px; }
.brand-features li { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; opacity: 0.9; }
.feature-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.terms-sheet-modal {
	--height: 85%;
	--border-radius: 20px;
}

.terms-modal-header {
	background: #ffffff;
	padding: 16px 20px 8px;
	border-bottom: 1px solid #e2e8f0;
}

.terms-modal-header-flex {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.terms-modal-title {
	font-size: 1.1rem;
	font-weight: 700;
	color: #111827;
	margin: 0;
}

.terms-modal-content {
	--background: #ffffff;
}

.terms-modal-body {
	padding: 16px 20px 40px;
	background: #ffffff;
	color: #334155;
}

.terms-updated {
	font-size: 0.78rem;
	color: #64748b;
	margin: 0 0 16px;
	font-weight: 500;
}

.terms-modal-body h4 {
	font-size: 0.88rem;
	font-weight: 700;
	color: #1e293b;
	margin: 16px 0 6px;
}

.terms-modal-body p {
	font-size: 0.82rem;
	color: #334155;
	line-height: 1.45;
	margin: 0 0 10px;
}

.terms-modal-body ul {
	margin: 0 0 12px;
	padding-left: 20px;
}

.terms-modal-body li {
	font-size: 0.82rem;
	line-height: 1.4;
	color: #334155;
	margin-bottom: 4px;
}




.terms-agree-btn[disabled] {
	opacity: 0.5;
}

.terms-action-row {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-top: 0;
}

.terms-scroll-prompt {
	text-align: center;
	margin-bottom: 12px;
}

.terms-scroll-link {
	background: none;
	border: none;
	color: #05c450;
	font-size: 0.9rem;
	font-weight: 600;
	cursor: pointer;
	padding: 8px 12px;
	transition: opacity 0.2s;
	font-family: inherit;
}

.terms-scroll-link:hover {
	opacity: 0.8;
}

.terms-modal-footer {
	background: #ffffff;
	padding: 10px 20px 16px;
	border-top: 1px solid #e2e8f0;
}

.terms-agree-btn {
	--background: #05c450;
	--background-activated: #04ab45;
	--border-radius: 9999px;
	--color: #ffffff !important;
	font-weight: 600;
	height: 48px;
	text-transform: none;
}

.terms-disagree-btn {
	--border-radius: 9999px;
	--border-color: #9ca3af;
	--color: #374151 !important;
	font-weight: 600;
	height: 48px;
	text-transform: none;
}

html.ion-palette-dark .auth-content { --background: #0f172a; }
html.ion-palette-dark .auth-card { background: #0f172a; }
html.ion-palette-dark .auth-title { color: #f1f5f9; }
html.ion-palette-dark .auth-subtitle { color: #94a3b8; }
html.ion-palette-dark .input-label { color: #cbd5e1; }
html.ion-palette-dark .custom-input {
	background: #1e293b !important;
	background-color: #1e293b !important;
	border-color: #334155 !important;
	color: #f1f5f9 !important;
	-webkit-text-fill-color: #f1f5f9 !important;
}
html.ion-palette-dark .custom-input::placeholder { color: #6b7280 !important; }
html.ion-palette-dark .username-feedback--checking {
	background: #1e293b;
	color: #94a3b8;
}
html.ion-palette-dark .username-feedback--success {
	background: #14532d;
	color: #86efac;
	border-color: #166534;
}
html.ion-palette-dark .username-feedback--error {
	background: #450a0a;
	color: #fca5a5;
	border-color: #7f1d1d;
}
html.ion-palette-dark .pass-criteria-grid { background: #1e293b; }
html.ion-palette-dark .criteria-item { color: #6b7280; }
html.ion-palette-dark .allergen-chip { border-color: #334155; color: #cbd5e1; }
html.ion-palette-dark .allergen-chip--selected { background: #15803d; border-color: #15803d; color: #fff; }
html.ion-palette-dark .halal-toggle-card { background: #1e293b; border-color: #334155; }
html.ion-palette-dark .halal-toggle-label { color: #f1f5f9; }
html.ion-palette-dark .halal-toggle-sub { color: #94a3b8; }
html.ion-palette-dark .back-to-home { color: #94a3b8; }
html.ion-palette-dark .remember-label { color: #cbd5e1 !important; }
html.ion-palette-dark .custom-input:focus { border-color: #05c450 !important; }
html.ion-palette-dark .custom-input.input-error { border-color: #ef4444 !important; }
html.ion-palette-dark .custom-input:-webkit-autofill,
html.ion-palette-dark .custom-input:-webkit-autofill:hover,
html.ion-palette-dark .custom-input:-webkit-autofill:focus {
-webkit-box-shadow: 0 0 0 1000px #1e293b inset !important;
-webkit-text-fill-color: #f1f5f9 !important;
}
html.ion-palette-dark .custom-checkbox-box { background-color: #1e293b !important; border-color: #334155 !important; }
html.ion-palette-dark .custom-checkbox-input:checked ~ .custom-checkbox-box { background-color: #05c450 !important; border-color: #05c450 !important; }
html.ion-palette-dark .google-btn { background: #1e293b; border-color: #334155; color: #f1f5f9; }
html.ion-palette-dark .google-btn:hover { background: #334155; border-color: #475569; }
html.ion-palette-dark .oauth-divider { color: #6b7280; }
html.ion-palette-dark .oauth-divider::before, html.ion-palette-dark .oauth-divider::after { border-bottom-color: #334155; }
html.ion-palette-dark .switch-auth { color: #94a3b8; }
html.ion-palette-dark .password-toggle { color: #94a3b8; }
html.ion-palette-dark .step-label { color: #94a3b8; }
html.ion-palette-dark .progress-segment { background: #334155; }
html.ion-palette-dark .progress-segment--filled { background: #05c450; }
html.ion-palette-dark .criteria-item.valid { color: #4ade80; }
html.ion-palette-dark .allergen-count-text { color: #cbd5e1; }
html.ion-palette-dark .allergen-dot { background: #334155; }
html.ion-palette-dark .allergen-dot--filled { background: #4ade80; }
html.ion-palette-dark .back-button { color: #f1f5f9 !important; }
html.ion-palette-dark .terms-sheet-modal { --background: #0f172a; }
html.ion-palette-dark .terms-modal-header { background: #0f172a !important; border-bottom-color: #334155 !important; }
html.ion-palette-dark .terms-modal-title { color: #f1f5f9 !important; }
html.ion-palette-dark .terms-modal-content { --background: #0f172a; --color: #f1f5f9; }
html.ion-palette-dark .terms-modal-body { background: #0f172a !important; color: #94a3b8 !important; }
html.ion-palette-dark .terms-modal-body h4 { color: #f1f5f9 !important; }
html.ion-palette-dark .terms-modal-body p, html.ion-palette-dark .terms-modal-body li { color: #94a3b8 !important; }
html.ion-palette-dark .terms-updated, html.ion-palette-dark .terms-footer-meta p { color: #94a3b8 !important; }
html.ion-palette-dark .terms-footer-meta { border-top-color: #334155 !important; }
html.ion-palette-dark .terms-modal-footer { background: #0f172a !important; border-top-color: #334155 !important; }
html.ion-palette-dark .terms-disagree-btn { --border-color: #334155; --color: #f1f5f9 !important; }

@media (min-width: 768px) {
	.auth-layout {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100%;
	}

	.auth-card {
		max-width: 500px;
		width: 100%;
		padding: 40px 40px 56px;
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
		max-width: 440px;
		margin-left: auto;
		margin-right: auto;
	}

	.auth-card .back-button {
		display: none;
	}
}

.custom-select {
	appearance: none;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 12px center;
	background-size: 12px;
	padding-right: 40px;
	cursor: pointer;
}

.custom-select:disabled, .app-date-picker--disabled.custom-input {
	background-color: #f3f4f6;
	cursor: not-allowed;
	color: #9ca3af;
}

.app-date-picker.custom-input {
	cursor: pointer;
}

.field-error-text {
	color: #b91c1c;
	font-size: 0.75rem;
	margin-top: 4px;
	display: block;
}

.google-password-message {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px;
	background-color: #e8f5e9;
	border: 1px solid #4caf50;
	border-radius: 8px;
	color: #2e7d32;
	font-size: 0.875rem;
	margin-bottom: 16px;
}

.google-password-message ion-icon {
	font-size: 20px;
	flex-shrink: 0;
}

html.ion-palette-dark .custom-select,
html.ion-palette-dark .app-date-picker.custom-input {
	color: #f1f5f9;
}

html.ion-palette-dark .custom-select {
	background-color: #1e293b;
	color: #f1f5f9;
	border-color: #334155;
}

html.ion-palette-dark .google-password-message {
	background-color: #1b5e20;
	border-color: #4caf50;
	color: #a5d6a7;
}
</style>
