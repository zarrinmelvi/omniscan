<template>
	<ion-page>
		<ion-content class="auth-content">
			<div class="auth-card">
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
								<input v-model="name" type="text" placeholder="Enter your name" required class="custom-input" />
							</div>
						</div>

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
									placeholder="Create a password"
									required
									class="custom-input" />
								<ion-icon
									:icon="showPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showPassword = !showPassword" />
							</div>
							<p class="hint-text">Must be at least 8 characters</p>
						</div>

						<div class="form-group">
							<label class="input-label">Confirm Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="confirmPassword"
									:type="showPassword ? 'text' : 'password'"
									placeholder="Re-enter your password"
									required
									class="custom-input" />
							</div>
						</div>

						<ion-button expand="block" type="submit" class="submit-button" :disabled="isSubmitting">
							{{ isSubmitting ? 'Creating account...' : 'Continue' }}
						</ion-button>
					</form>

					<p class="switch-auth">
						Already have an account?
						<router-link to="/login" class="switch-link">Sign In</router-link>
					</p>

					<p class="legal-text">
						By continuing you agree to OmniScan's
						<a href="#" @click.prevent>Terms of Service</a> and
						<a href="#" @click.prevent>Privacy Policy</a>
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
							@click="halalSelected = !halalSelected">
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

					<div v-if="prefsError" class="form-error">{{ prefsError }}</div>

					<ion-button expand="block" class="submit-button" :disabled="isSavingPrefs" @click="completeSetup">
						{{ isSavingPrefs ? 'Saving...' : 'Complete Setup' }}
					</ion-button>

					<button type="button" class="skip-link" :disabled="isSavingPrefs" @click="skipForNow">Skip for now</button>
				</template>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import { chevronBackOutline, eyeOutline, eyeOffOutline, alertCircleOutline } from 'ionicons/icons'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, ApiError } from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

const step = ref<1 | 2>(1)

// Step 1 — account creation
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

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

// Emoji per allergen name – anything fetched from the catalog that isn't
// in this map (e.g. a new allergen an admin adds later) still renders,
// just with a generic fallback icon instead of a blank card.
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
	if (step.value === 2) {
		// Account + session already exist at this point – going back just
		// re-shows the form, it won't re-run account creation unless the
		// user submits it again (which would correctly fail as a duplicate
		// email, same as re-submitting any already-used signup form).
		step.value = 1
		return
	}
	router.back()
}

async function handleRegister(): Promise<void> {
	errorMessage.value = null

	if (password.value.length < 8) {
		errorMessage.value = 'Password must be at least 8 characters.'
		return
	}
	if (password.value !== confirmPassword.value) {
		errorMessage.value = 'Passwords do not match.'
		return
	}

	isSubmitting.value = true

	try {
		await authStore.register(name.value.trim(), email.value, password.value)
		// register() doesn't return a token – log in immediately after so
		// step 2 can call authenticated endpoints (saving prefs needs a
		// session the same way the Profile page does).
		await authStore.login(email.value, password.value)

		step.value = 2
		fetchAllergenCatalog()
	} catch (err) {
		errorMessage.value = err instanceof ApiError ? err.message : 'Registration failed. Please try again.'
	} finally {
		isSubmitting.value = false
	}
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
	} else {
		selectedAllergenIds.value.push(id)
	}
}

async function completeSetup(): Promise<void> {
	isSavingPrefs.value = true
	prefsError.value = ''

	try {
		await apiFetch('/api/users', {
			method: 'PUT',
			body: { halal_pref: halalSelected.value, allergen_ids: selectedAllergenIds.value },
		})
		router.replace('/tabs/home')
	} catch (err) {
		prefsError.value = err instanceof ApiError ? err.message : 'Failed to save your preferences.'
	} finally {
		isSavingPrefs.value = false
	}
}

function skipForNow(): void {
	router.replace('/tabs/home')
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
</style>