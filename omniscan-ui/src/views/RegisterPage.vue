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
							<div class="dark-mode-toggle-row">
								<span>Dark mode</span>
								<ion-toggle :checked="isDark" @ion-change="toggleDarkMode" class="custom-toggle" />
							</div>
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
									<input v-model="firstName" type="text" placeholder="First name" class="custom-input" :class="{ 'input-error': fieldErrors.firstName }" @input="clearFieldError('firstName')" />
								</div>
								<div class="form-group">
									<label class="input-label">Last name</label>
									<input v-model="lastName" type="text" placeholder="Last name" class="custom-input" :class="{ 'input-error': fieldErrors.lastName }" @input="clearFieldError('lastName')" />
								</div>
							</div>
							<button type="button" class="add-middle-link" @click="showMiddleName = !showMiddleName">
								{{ showMiddleName ? '− Remove middle name' : '+ Add middle name (optional)' }}
							</button>
							<div v-if="showMiddleName" class="form-group">
								<input v-model="middleName" type="text" placeholder="Middle name" class="custom-input" />
							</div>

							<div class="form-group">
								<label class="input-label">Username</label>
								<div class="custom-input-wrapper">
									<input
										v-model="username"
										type="text"
										placeholder="Choose a username"
										class="custom-input"
										:class="{ 'input-error': fieldErrors.username }"
										@input="clearFieldError('username')" />
								</div>
							</div>

							<div class="form-group">
								<label class="input-label">Email Address</label>
								<div class="custom-input-wrapper">
									<input
										v-model="email"
										type="text"
										placeholder="your@email.com"
										class="custom-input"
										:class="{ 'input-error': fieldErrors.email }"
										@input="clearFieldError('email')" />
								</div>
							</div>

							<div class="form-group">
								<label class="input-label">Password</label>
								<div class="custom-input-wrapper">
									<input
										v-model="password"
										:type="showPassword ? 'text' : 'password'"
										placeholder="Create a password"
										class="custom-input"
										:class="{ 'input-error': fieldErrors.password }"
										@input="clearFieldError('password')" />
									<ion-icon
										:icon="showPassword ? eyeOffOutline : eyeOutline"
										class="password-toggle"
										@click="showPassword = !showPassword" />
								</div>
							</div>

							<div class="pass-criteria-grid">
								<div class="criteria-item" :class="{ valid: passCriteria.length }">
									<span class="criteria-circle">{{ passCriteria.length ? '✓' : '' }}</span>
									At least 8 characters
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.upper }">
									<span class="criteria-circle">{{ passCriteria.upper ? '✓' : '' }}</span>
									1 uppercase letter (A–Z)
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.lower }">
									<span class="criteria-circle">{{ passCriteria.lower ? '✓' : '' }}</span>
									1 lowercase letter (a–z)
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.number }">
									<span class="criteria-circle">{{ passCriteria.number ? '✓' : '' }}</span>
									1 number (0–9)
								</div>
								<div class="criteria-item" :class="{ valid: passCriteria.special }">
									<span class="criteria-circle">{{ passCriteria.special ? '✓' : '' }}</span>
									1 special character (!@#$%^&*)
								</div>
							</div>

							<div class="form-group margin-top">
								<label class="input-label">Confirm Password</label>
								<div class="custom-input-wrapper">
									<input
										v-model="confirmPassword"
										:type="showConfirmPassword ? 'text' : 'password'"
										placeholder="Re-enter your password"
										class="custom-input"
										:class="{ 'input-error': fieldErrors.confirmPassword }"
										@input="clearFieldError('confirmPassword')" />
									<ion-icon
										:icon="showConfirmPassword ? eyeOffOutline : eyeOutline"
										class="password-toggle"
										@click="showConfirmPassword = !showConfirmPassword" />
								</div>
							</div>

							<ion-button
								expand="block"
								type="submit"
								class="submit-button"
								:disabled="isSubmitting || !isPasswordValid || password !== confirmPassword">
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
						<span class="brand-label">{{ route.query.step === '2' ? 'Email Verified! 🎉' : 'Almost There!' }}</span>
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
									<span v-if="selectedAllergenIds.includes(allergen.id)" class="chip-check">✓</span>
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

						<div class="terms-check-row">
							<label class="checkbox-container">
								<input v-model="termsAccepted" type="checkbox" class="custom-checkbox-input" />
								<span class="custom-checkbox-box"></span>
								<span class="remember-label">I agree to the <button type="button" class="terms-inline-btn" @click="isTermsOpen = true">Terms and Conditions</button></span>
							</label>
						</div>

						<div class="step2-actions">
							<button type="button" class="btn-back" @click="step = 1">Back</button>
							<ion-button expand="block" class="submit-button" :disabled="isSavingPrefs || !termsAccepted" @click="completeSetup">
								<ion-spinner v-if="isSavingPrefs" name="crescent" class="btn-spinner" />
								<span v-else>Create account</span>
							</ion-button>
						</div>
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
					<p class="terms-updated">Last Updated: September 7, 2026</p>

					<p>Welcome to OmniScan, a cross-platform pantry management and food information system developed as part of a Bachelor of Science in Information Technology capstone project at STI College San Jose Del Monte.</p>
					<p>These Terms &amp; Conditions ("Terms") govern your access to and use of the OmniScan web application and mobile application ("Application" or "System"). By creating an account, accessing, or using OmniScan, you acknowledge that you have read, understood, and agreed to these Terms.</p>
					<p>If you do not agree with any part of these Terms, please discontinue your use of the Application.</p>

					<h4>1. Purpose of OmniScan</h4>
					<p>OmniScan is designed to assist users in making more informed food purchasing and household food management decisions.</p>
					<p>The Application provides features that may include:</p>
					<ul>
						<li>Food product scanning and image uploading;</li>
						<li>Ingredient text extraction and interpretation;</li>
						<li>Potential allergen detection;</li>
						<li>Halal logo and dietary compliance checking;</li>
						<li>Color-coded food safety alerts;</li>
						<li>Alternative product recommendations;</li>
						<li>Digital pantry management;</li>
						<li>Expiration and best-before date reminders;</li>
						<li>AI-generated recipe recommendations; and</li>
						<li>Personalized dietary profiles.</li>
					</ul>
					<p>OmniScan uses technologies such as Optical Character Recognition (OCR), computer vision, artificial intelligence, and reference databases to provide these features.</p>

					<h4>2. Eligibility and Account Registration</h4>
					<p>Users may be required to create an account to access certain features of OmniScan.</p>

					<h4>3. Dietary Profile Information</h4>
					<p>OmniScan allows users to create and manage personalized dietary profiles, including food allergies, allergen sensitivities, and Halal preferences.</p>

					<h4>4. Food Scanning and AI Analysis</h4>
					<p>OmniScan may analyze uploaded or scanned food product images using OCR, computer vision, artificial intelligence, and reference databases.</p>

					<h4>5. Food Safety Disclaimer</h4>
					<p>OmniScan does not guarantee that a food product is completely safe, allergen-free, Halal-certified, or suitable for a particular individual.</p>
				</div>
			</ion-content>
			<ion-footer class="ion-no-border terms-modal-footer">
				<div v-if="!termsScrolledToBottom" class="terms-scroll-hint">
					<ion-button fill="clear" size="small" class="terms-scroll-btn" @click="scrollTermsToBottom">
						<ion-icon :icon="arrowDownOutline" slot="start" />
						Scroll to Bottom
					</ion-button>
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
import { chevronBackOutline, eyeOutline, eyeOffOutline, alertCircleOutline, arrowDownOutline } from 'ionicons/icons'
import { Capacitor } from '@capacitor/core'
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, ApiError, API_BASE_URL } from '@/utils/api'
import { useDarkMode } from '@/composables/useDarkMode'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { isDark, toggle: toggleDarkMode } = useDarkMode()

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
			step.value = 2
			fetchAllergenCatalog()
			router.replace({ path: '/register', query: { step: '2' } })
		} catch (error: any) {
			console.error('Native Google Sign-Up failed:', error)
			const errMsg = error?.message || 'Google sign-up failed. Please try again.'
			void showToast(errMsg, 'danger')
		} finally {
			isGoogleSubmitting.value = false
		}
	} else {
		window.location.href = `${API_BASE_URL}/api/auth/google`
	}
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
const middleName = ref('')
const lastName = ref('')
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showMiddleName = ref(false)
const isSubmitting = ref(false)
const isTermsOpen = ref(false)
const termsAccepted = ref(false)
const errorMessage = ref<string | null>(null)

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
	return c.length && c.upper && c.lower && c.number && c.special
})

const fieldErrors = reactive({
	firstName: false,
	lastName: false,
	username: false,
	email: false,
	password: false,
	confirmPassword: false,
})

function clearFieldError(field: keyof typeof fieldErrors) {
	fieldErrors[field] = false
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

function formatAllergenName(name: string): string {
	return name.replace(/\b\w/g, (char) => char.toUpperCase())
}

function handleBack(): void {
	if (window.history.length <= 1) {
		router.replace('/')
	} else {
		router.back()
	}
}

async function redirectIfAlreadyAuthenticated(): Promise<boolean> {
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

async function handleRegister(): Promise<void> {
	errorMessage.value = null
	fieldErrors.firstName = false
	fieldErrors.lastName = false
	fieldErrors.username = false
	fieldErrors.email = false
	fieldErrors.password = false
	fieldErrors.confirmPassword = false

	let hasEmptyField = false
	if (!firstName.value.trim()) { fieldErrors.firstName = true; hasEmptyField = true }
	if (!lastName.value.trim()) { fieldErrors.lastName = true; hasEmptyField = true }
	if (!username.value.trim()) { fieldErrors.username = true; hasEmptyField = true }
	if (!email.value.trim()) { fieldErrors.email = true; hasEmptyField = true }
	if (!password.value) { fieldErrors.password = true; hasEmptyField = true }
	if (!confirmPassword.value) { fieldErrors.confirmPassword = true; hasEmptyField = true }
	if (hasEmptyField) {
		errorMessage.value = 'Please fill in all required fields.'
		return
	}

	const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
	if (!USERNAME_RE.test(username.value.trim())) {
		fieldErrors.username = true
		errorMessage.value = 'Username must be 3-20 characters, letters, numbers, and underscores only.'
		return
	}

	if (!EMAIL_RE.test(email.value) || !isAllowedEmailDomain(email.value)) {
		fieldErrors.email = true
		errorMessage.value = 'Only @gmail.com, @outlook.com, @hotmail.com, and @yahoo.com emails are accepted.'
		return
	}

	if (!isPasswordValid.value) {
		fieldErrors.password = true
		errorMessage.value = 'Please ensure your password meets all safety criteria.'
		return
	}

	if (password.value !== confirmPassword.value) {
		fieldErrors.password = true
		fieldErrors.confirmPassword = true
		errorMessage.value = 'Passwords do not match.'
		return
	}

	isTermsOpen.value = true
}

async function acceptTerms(): Promise<void> {
	isTermsOpen.value = false
	termsAccepted.value = true

	if (await redirectIfAlreadyAuthenticated()) {
		return
	}

	isSubmitting.value = true
	try {
		const response = await authStore.register(
			[firstName.value.trim(), middleName.value.trim()].filter(Boolean).join(' '),
			lastName.value.trim(),
			username.value.trim(),
			email.value,
			password.value,
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
	isTermsOpen.value = false
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
		window.location.href = '/tabs/home'
	} catch (err) {
		prefsError.value = err instanceof ApiError ? err.message : 'Failed to save your preferences.'
	} finally {
		isSavingPrefs.value = false
	}
}

function onWindowFocus(): void {
	if (step.value === 1) {
		redirectIfAlreadyAuthenticated()
	}
}

onMounted(async () => {
	if (Capacitor.isNativePlatform()) {
		try {
			await GoogleSignIn.initialize({
				clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // Put your Google Web Client ID here
			})
		} catch (e) {
			console.warn('GoogleSignIn plugin initialization warning:', e)
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
.dark-mode-toggle-row { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #6b7280; }

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
.add-middle-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #05c450; font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 0; margin: 4px 0 14px; }

.pass-criteria-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-top: 10px; padding: 12px 14px; background: #f9fafb; border-radius: 10px; margin-bottom: 14px; }
.criteria-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #9ca3af; }
.criteria-item.valid { color: #15803d; }
.criteria-circle { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid #d1d5db; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.65rem; font-weight: 700; }
.criteria-item.valid .criteria-circle { border-color: #15803d; color: #15803d; }

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
.chip-check { font-size: 0.8rem; }
.allergen-limit-banner { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 10px; padding: 10px 14px; font-size: 0.82rem; margin-bottom: 14px; }

.halal-toggle-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.halal-toggle-text { flex: 1; }
.halal-toggle-label { font-size: 0.9rem; font-weight: 600; color: #111827; margin: 0 0 2px; }
.halal-toggle-sub { font-size: 0.78rem; color: #6b7280; margin: 0; line-height: 1.4; }

.terms-check-row { margin-bottom: 16px; }
.terms-inline-btn { background: none; border: none; color: #05c450; font-weight: 600; cursor: pointer; font-size: inherit; padding: 0; }

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

.step2-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-top: 8px; }
.btn-back { height: 48px; border: 1.5px solid #d1d5db; border-radius: 9999px; background: transparent; color: #374151; font-size: 0.9rem; font-weight: 600; cursor: pointer; }

.brand-features { list-style: none; padding: 0; margin: 28px 0 0; display: flex; flex-direction: column; gap: 16px; }
.brand-features li { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; opacity: 0.9; }
.feature-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.terms-sheet-modal {
	--height: 85%;
	--border-radius: 20px 20px 0 0;
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

.terms-scroll-hint {
	display: flex;
	justify-content: center;
	margin: 8px 0 4px;
}

.terms-scroll-btn {
	--color: #05c450;
	font-size: 0.82rem;
	text-transform: none;
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

:global(html.ion-palette-dark) .auth-content { --background: #0b160b; }
:global(html.ion-palette-dark) .auth-card { background: #0b160b; }
:global(html.ion-palette-dark) .auth-title { color: #f9fafb; }
:global(html.ion-palette-dark) .auth-subtitle { color: #9ca3af; }
:global(html.ion-palette-dark) .input-label { color: #d1d5db; }
:global(html.ion-palette-dark) .custom-input { background: #172617; border-color: #2d4a2d; color: #f9fafb; }
:global(html.ion-palette-dark) .custom-input::placeholder { color: #6b7280; }
:global(html.ion-palette-dark) .pass-criteria-grid { background: #172617; }
:global(html.ion-palette-dark) .criteria-item { color: #6b7280; }
:global(html.ion-palette-dark) .allergen-chip { border-color: #2d4a2d; color: #d1d5db; }
:global(html.ion-palette-dark) .allergen-chip--selected { background: #15803d; border-color: #15803d; color: #fff; }
:global(html.ion-palette-dark) .halal-toggle-card { background: #172617; border-color: #2d4a2d; }
:global(html.ion-palette-dark) .halal-toggle-label { color: #f9fafb; }
:global(html.ion-palette-dark) .halal-toggle-sub { color: #9ca3af; }
:global(html.ion-palette-dark) .btn-back { border-color: #2d4a2d; color: #d1d5db; }
:global(html.ion-palette-dark) .back-to-home { color: #9ca3af; }
:global(html.ion-palette-dark) .dark-mode-toggle-row { color: #9ca3af; }
:global(html.ion-palette-dark) .remember-label { color: #d1d5db; }
:global(html.ion-palette-dark) .terms-sheet-modal { --background: #0b160b; }
:global(html.ion-palette-dark) .terms-modal-header { background: #0f1f0f !important; border-bottom-color: #2d4a2d !important; }
:global(html.ion-palette-dark) .terms-modal-title { color: #f9fafb !important; }
:global(html.ion-palette-dark) .terms-modal-content { --background: #0b160b; --color: #e2e8f0; }
:global(html.ion-palette-dark) .terms-modal-body { background: #0b160b !important; color: #d1d5db !important; }
:global(html.ion-palette-dark) .terms-modal-body h4 { color: #f9fafb !important; }
:global(html.ion-palette-dark) .terms-modal-body p { color: #9ca3af !important; }
:global(html.ion-palette-dark) .terms-modal-body li { color: #9ca3af !important; }
:global(html.ion-palette-dark) .terms-updated { color: #6b7280 !important; }
:global(html.ion-palette-dark) .terms-modal-footer { background: #0f1f0f !important; border-top-color: #2d4a2d !important; }
:global(html.ion-palette-dark) .terms-disagree-btn { --border-color: #2d4a2d; --color: #d1d5db !important; }

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
</style>