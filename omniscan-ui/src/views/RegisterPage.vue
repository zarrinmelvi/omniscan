<template>
	<ion-page>
		<ion-content class="auth-content" :scroll-y="true">
			<div class="auth-card">
				<!-- Back button shown ONLY on Step 1 -->
				<button v-if="step === 1" class="back-button" @click="handleBack">
					<ion-icon :icon="chevronBackOutline" />
				</button>

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
						<div class="form-group">
							<label class="input-label">Full Name</label>
							<div class="custom-input-wrapper">
								<input
									v-model="name"
									type="text"
									placeholder="Enter your name"
									class="custom-input"
									:class="{ 'input-error': fieldErrors.name }"
									@input="clearFieldError('name')" />
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
							<p class="hint-text">Min. 8 chars, 1 uppercase, 1 number, 1 special character</p>
						</div>

						<div class="form-group">
							<label class="input-label">Confirm Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="confirmPassword"
									:type="showPassword ? 'text' : 'password'"
									placeholder="Re-enter your password"
									class="custom-input"
									:class="{ 'input-error': fieldErrors.confirmPassword }"
									@input="clearFieldError('confirmPassword')" />
							</div>
						</div>

						<!-- Terms & Conditions checkbox removed — modal opens after validation in handleRegister -->

						<ion-button expand="block" type="submit" class="submit-button" :disabled="isSubmitting">
							{{ isSubmitting ? 'Creating account...' : 'Continue' }}
						</ion-button>
					</form>

					<p class="switch-auth">
						Already have an account?
						<router-link to="/login" class="switch-link">Sign In</router-link>
					</p>


				</template>

				<!-- STEP 2: Dietary Preferences -->
				<template v-else>
					<span class="brand-label">Almost There!</span>
					<h1 class="auth-title">Dietary Preferences</h1>
					<p class="auth-subtitle">Select your dietary preferences so we can help you make better choices</p>

					<div v-if="isLoadingAllergens" class="state-block">
						<ion-spinner name="crescent" />
					</div>

					<div v-else-if="allergensLoadError" class="inline-error">
						<ion-icon :icon="alertCircleOutline" color="danger" />
						<span>{{ allergensLoadError }}</span>
						<ion-button size="small" fill="clear" @click="fetchAllergenCatalog">Retry</ion-button>
					</div>

					<div v-else class="pref-grid">
						<button
							type="button"
							class="pref-card"
							:class="{ 'pref-card--selected': halalSelected }"
							@click="toggleHalal()">
							<span class="pref-emoji">🕌</span>
							<span class="pref-label">Halal</span>
						</button>

						<button
							v-for="allergen in allergenCatalog"
							:key="allergen.id"
							type="button"
							class="pref-card"
							:class="{ 'pref-card--selected': selectedAllergenIds.includes(allergen.id) }"
							@click="toggleAllergen(allergen.id)">
							<span class="pref-emoji">{{ emojiForAllergen(allergen.name) }}</span>
							<span class="pref-label">{{ formatAllergenName(allergen.name) }}</span>
						</button>
					</div>

					<p v-if="prefLimitWarning" class="pref-limit-warning">You can select up to 5 dietary preferences.</p>

					<div v-if="prefsError" class="form-error">{{ prefsError }}</div>

					<ion-button expand="block" class="submit-button" :disabled="isSavingPrefs" @click="completeSetup">
						{{ isSavingPrefs ? 'Saving...' : 'Complete Setup' }}
					</ion-button>

					<button type="button" class="skip-link" :disabled="isSavingPrefs" @click="skipForNow">Skip for now</button>
				</template>
			</div>
		</ion-content>

		<!-- Terms & Conditions Sheet Modal -->
		<ion-modal :is-open="isTermsOpen" @didDismiss="isTermsOpen = false" class="terms-sheet-modal">
			<ion-header class="ion-no-border terms-modal-header">
				<div class="terms-modal-header-flex">
					<h2 class="terms-modal-title">Terms &amp; Conditions</h2>
					<ion-button fill="clear" class="terms-modal-close-btn" @click="isTermsOpen = false">
						<ion-icon :icon="closeOutline" slot="icon-only" />
					</ion-button>
				</div>
			</ion-header>
			<ion-content class="terms-modal-content">
				<div class="terms-modal-body">
					<p class="terms-updated">Last updated: September 7, 2026</p>
					<p>OmniScan is designed to assist users in making more informed food purchasing and household food management decisions. The features include food product scanning, allergen detection, Halal compliance checking, digital pantry management, expiration reminders, and AI-generated recipe recommendations.</p>
					<h3>Eligibility &amp; Account Registration</h3>
					<p>You must provide accurate information, keep credentials confidential, and notify us of any unauthorized access. You are responsible for activities performed through your account.</p>
					<h3>Dietary Profile</h3>
					<p>Dietary profile data is used to personalise food analysis and recommendations. You are responsible for ensuring the accuracy of information in your profile.</p>
					<h3>Food Safety Disclaimer</h3>
					<p>OmniScan does not guarantee a product is completely safe, allergen-free, or Halal-certified. Always verify product packaging before consuming, especially for severe allergies or health conditions.</p>
					<h3>Limitations of Detection</h3>
					<p>Detection accuracy may be affected by image quality, packaging design, and the completeness of available data. Rare allergens or newly released products may not be detected.</p>
					<h3>Acceptable Use</h3>
					<p>Do not use OmniScan for unlawful purposes, attempt unauthorized access, upload malicious content, or misuse system features.</p>
					<h3>Privacy</h3>
					<p>Personal information is collected and stored in accordance with applicable privacy policies. Review our Privacy Policy for details on data collection and retention.</p>
					<div class="terms-action-row">
						<ion-button expand="block" class="terms-agree-btn" @click="acceptTerms">
							I Agree
						</ion-button>
						<ion-button expand="block" fill="outline" class="terms-disagree-btn" @click="disagreeTerms">
							I Disagree
						</ion-button>
					</div>
				</div>
			</ion-content>
		</ion-modal>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner, IonModal, IonHeader, toastController } from '@ionic/vue'
import { chevronBackOutline, eyeOutline, eyeOffOutline, alertCircleOutline, closeOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, ApiError } from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const PREF_MAX = 5

const step = ref<1 | 2>(1)

// Step 1 — account creation
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const isTermsOpen = ref(false)
const errorMessage = ref<string | null>(null)

// Per-field validation error flags
const fieldErrors = reactive({
	name: false,
	email: false,
	password: false,
	confirmPassword: false,
})

function clearFieldError(field: keyof typeof fieldErrors) {
	fieldErrors[field] = false
}

async function showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
	const toast = await toastController.create({
		message,
		duration: 3000,
		color,
		position: 'top',
	})
	await toast.present()
}

// Strict email validation
const KNOWN_TLDS =
	'com|org|net|edu|gov|mil|int|info|biz|name|pro|' +
	'app|dev|io|ai|co|me|tv|cc|online|store|' +
	'us|uk|ca|au|de|fr|jp|cn|br|in|mx|ph|sg|nz|za|' +
	'ng|ke|pk|bd|id|my|th|vn|' +
	'es|it|nl|pl|se|no|fi|dk|be|ch|at|ru|tr|' +
	'sa|ae|eg|il|ar|cl|pe|ve'
const EMAIL_RE = new RegExp(`^[^\\s@]+@[^\\s@]+(\\.[^\\s@]+)*\\.(${KNOWN_TLDS})$`, 'i')

// Step 2 — dietary preferences
interface Allergen {
	id: number
	name: string
	scientific_name: string
}

const allergenCatalog = ref<Allergen[]>([])
const selectedAllergenIds = ref<number[]>([])
const halalSelected = ref(false)
const isLoadingAllergens = ref(false)
const allergensLoadError = ref('')
const isSavingPrefs = ref(false)
const prefsError = ref('')
const prefLimitWarning = ref(false)

const prefTotal = computed(() => selectedAllergenIds.value.length + (halalSelected.value ? 1 : 0))

const ALLERGEN_EMOJI: Record<string, string> = {
	milk: '🥛',
	eggs: '🥚',
	fish: '🐟',
	shellfish: '🦐',
	'tree nuts': '🌰',
	peanuts: '🥜',
	wheat: '🌾',
	soy: '🫘',
}

function emojiForAllergen(name: string): string {
	return ALLERGEN_EMOJI[name.toLowerCase()] ?? '🍽️'
}

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

async function handleRegister(): Promise<void> {
	errorMessage.value = null
	fieldErrors.name = false
	fieldErrors.email = false
	fieldErrors.password = false
	fieldErrors.confirmPassword = false

	// Empty-field checks — sets red border immediately so the user can see
	// which fields they skipped, without relying on the browser's native
	// required tooltip which intercepts the submit before our handler runs.
	let hasEmptyField = false
	if (!name.value.trim()) { fieldErrors.name = true; hasEmptyField = true }
	if (!email.value.trim()) { fieldErrors.email = true; hasEmptyField = true }
	if (!password.value) { fieldErrors.password = true; hasEmptyField = true }
	if (!confirmPassword.value) { fieldErrors.confirmPassword = true; hasEmptyField = true }
	if (hasEmptyField) {
		errorMessage.value = 'Please fill in all required fields.'
		return
	}

	if (!EMAIL_RE.test(email.value)) {
		fieldErrors.email = true
		errorMessage.value = 'Please enter a valid email address (e.g. user@example.com).'
		return
	}

	if (password.value.length < 8) {
		fieldErrors.password = true
		errorMessage.value = 'Password must be at least 8 characters.'
		return
	}

	if (!/[A-Z]/.test(password.value)) {
		fieldErrors.password = true
		errorMessage.value = 'Password must contain at least one uppercase letter.'
		return
	}

	if (!/[0-9]/.test(password.value)) {
		fieldErrors.password = true
		errorMessage.value = 'Password must contain at least one number.'
		return
	}

	if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password.value)) {
		fieldErrors.password = true
		errorMessage.value = 'Password must contain at least one special character (e.g. !@#$%).'
		return
	}

	if (name.value.trim() === password.value) {
		fieldErrors.name = true
		fieldErrors.password = true
		errorMessage.value = 'Name and password cannot be identical.'
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
	isSubmitting.value = true
	try {
		await authStore.register(name.value.trim(), email.value, password.value)
		await authStore.login(email.value, password.value)
		await showToast('Account created successfully!', 'success')
		step.value = 2
		fetchAllergenCatalog()
	} catch (err) {
		if (err instanceof ApiError) {
			if (err.status === 409 || err.message.toLowerCase().includes('email')) {
				fieldErrors.email = true
				errorMessage.value = 'This email address already exists.'
			} else {
				errorMessage.value = err.message
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
		allergenCatalog.value = await apiFetch<Allergen[]>('/api/allergen', { method: 'GET' })
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
		if (prefTotal.value >= PREF_MAX) {
			prefLimitWarning.value = true
			return
		}
		selectedAllergenIds.value.push(id)
	}
}

function toggleHalal(): void {
	if (!halalSelected.value && prefTotal.value >= PREF_MAX) {
		prefLimitWarning.value = true
		return
	}
	halalSelected.value = !halalSelected.value
	if (!halalSelected.value) {
		prefLimitWarning.value = false
	}
}

async function completeSetup(): Promise<void> {
	if (isSavingPrefs.value) return

	isSavingPrefs.value = true
	prefsError.value = ''

	// Convert selected Allergen IDs into formatted tag names (e.g. Milk-free) for custom_preferences
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
		await authStore.checkAuth()
		window.location.href = '/tabs/home'
	} catch (err) {
		prefsError.value = err instanceof ApiError ? err.message : 'Failed to save your preferences.'
	} finally {
		isSavingPrefs.value = false
	}
}

async function skipForNow(): Promise<void> {
	if (isSavingPrefs.value) return
	await authStore.checkAuth()
	window.location.href = '/tabs/home'
}
</script>

<style scoped>
.auth-content {
	--background: #ffffff;
	--overflow: auto;
}

/* Hide scrollbar track visually on mobile web views */
.auth-content::part(scroll) {
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.auth-content::part(scroll)::-webkit-scrollbar {
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

.custom-input.input-error {
	border-color: #ef4444 !important;
}

.custom-input.input-error:focus {
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

.hint-text {
	font-size: 0.75rem;
	color: #6b7280;
	margin: 4px 0 0;
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
	margin-top: 24px;
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

.legal-text {
	color: #6b7280;
	font-size: 0.72rem;
	line-height: 1.4;
	text-align: center;
	margin-top: 32px;
}

.legal-text a {
	color: #05c450;
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

/* Step 2 Cards Grid */
.pref-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
	margin-bottom: 24px;
}

.pref-card {
	border: 1px solid #e5e7eb;
	background: #ffffff;
	border-radius: 16px;
	padding: 18px 12px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.pref-card--selected {
	border-color: #05c450;
	background: #f0fdf4;
	box-shadow: 0 0 0 1px #05c450;
}

.pref-emoji {
	font-size: 1.8rem;
	line-height: 1;
}

.pref-label {
	font-size: 0.85rem;
	font-weight: 600;
	color: #111827;
}

.skip-link {
	display: block;
	width: 100%;
	text-align: center;
	background: none;
	border: none;
	color: #6b7280;
	font-size: 0.85rem;
	padding: 16px 0 0;
	cursor: pointer;
}

.pref-limit-warning {
	color: #d97706;
	font-size: 0.78rem;
	margin: -12px 0 12px;
}

/* === Terms & Conditions checkbox === */
.terms-row {
	margin-top: 20px;
	margin-bottom: 4px;
}

.terms-label {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	font-size: 0.85rem;
	color: var(--ion-text-color, #374151);
	cursor: pointer;
	line-height: 1.4;
}

.terms-label--error .terms-checkbox {
	outline: 2px solid #ef4444;
	outline-offset: 1px;
}

.terms-checkbox {
	width: 18px;
	height: 18px;
	border-radius: 4px;
	border: 1px solid var(--ion-color-medium, #9ca3af);
	accent-color: #05c450;
	cursor: default;
	pointer-events: none;
	flex-shrink: 0;
	margin-top: 1px;
}

.terms-link {
	background: none;
	border: none;
	padding: 0;
	color: #05c450;
	font-weight: 600;
	font-size: inherit;
	cursor: pointer;
	text-decoration: underline;
}

.terms-error-msg {
	color: #ef4444;
	font-size: 0.78rem;
	margin: 6px 0 0 28px;
}

/* === Terms modal === */
.terms-sheet-modal {
	--height: 85%;
	--border-radius: 20px 20px 0 0;
}

.terms-modal-header {
	background: var(--ion-background-color, #ffffff);
	padding: 16px 20px 8px;
	border-bottom: 1px solid var(--ion-color-light-shade, #e2e8f0);
}

.terms-modal-header-flex {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.terms-modal-title {
	font-size: 1.1rem;
	font-weight: 700;
	color: var(--ion-text-color, #111827);
	margin: 0;
}

.terms-modal-close-btn {
	--color: var(--ion-color-medium, #6b7280);
	--padding-start: 0;
	--padding-end: 0;
}

.terms-modal-content {
	--background: var(--ion-background-color, #ffffff);
}

.terms-modal-body {
	padding: 16px 20px 40px;
}

.terms-updated {
	font-size: 0.78rem;
	color: var(--ion-color-medium, #6b7280);
	margin-bottom: 16px;
}

.terms-modal-body h3 {
	font-size: 0.9rem;
	font-weight: 700;
	color: var(--ion-text-color, #111827);
	margin: 16px 0 6px;
}

.terms-modal-body p {
	font-size: 0.85rem;
	color: var(--ion-color-medium-shade, #374151);
	line-height: 1.5;
	margin: 0;
}

.terms-accept-btn {
	--background: #05c450;
	--background-activated: #04ab45;
	--border-radius: 9999px;
	--color: #ffffff;
	font-weight: 600;
	height: 48px;
	text-transform: none;
	margin-top: 32px;
}

.terms-action-row {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-top: 32px;
}

.terms-agree-btn {
	--background: #05c450;
	--background-activated: #04ab45;
	--border-radius: 9999px;
	--color: #ffffff;
	font-weight: 600;
	height: 48px;
	text-transform: none;
}

.terms-disagree-btn {
	--border-radius: 9999px;
	--border-color: var(--ion-color-medium, #9ca3af);
	--color: var(--ion-text-color, #374151);
	font-weight: 600;
	height: 48px;
	text-transform: none;
}
</style>