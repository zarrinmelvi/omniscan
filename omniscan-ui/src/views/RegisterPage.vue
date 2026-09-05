<template>
	<ion-page>
		<ion-content class="ion-padding auth-content">
			<div class="auth-card">
				<ion-button fill="clear" class="back-button" @click="handleBack">
					<ion-icon :icon="chevronBackOutline" slot="icon-only" />
				</ion-button>

				<div class="progress-bar">
					<div class="progress-segment" :class="{ 'progress-segment--filled': step >= 1 }"></div>
					<div class="progress-segment" :class="{ 'progress-segment--filled': step >= 2 }"></div>
				</div>
				<p v-if="step === 1" class="step-label">Step 1 of 2</p>
				<p v-else class="step-label step-label--accent">Almost There!</p>

				<!-- STEP 1: Create Account -->
				<template v-if="step === 1">
					<h1 class="auth-title">Create Account</h1>
					<p class="auth-subtitle">Let's get started with your smart pantry</p>

					<div v-if="errorMessage" class="form-error">{{ errorMessage }}</div>

					<form @submit.prevent="handleRegister">
						<ion-item lines="none" class="form-field">
							<ion-label position="stacked">Full Name</ion-label>
							<ion-input v-model="name" placeholder="Enter your name" required />
						</ion-item>

						<ion-item lines="none" class="form-field">
							<ion-label position="stacked">Email Address</ion-label>
							<ion-input v-model="email" type="email" placeholder="your@email.com" required />
						</ion-item>

						<ion-item lines="none" class="form-field">
							<ion-label position="stacked">Password</ion-label>
							<ion-input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Create a password" required>
								<ion-icon
									slot="end"
									:icon="showPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showPassword = !showPassword" />
							</ion-input>
						</ion-item>
						<p class="hint-text">Minimum of 6 characters</p>

						<ion-item lines="none" class="form-field">
							<ion-label position="stacked">Confirm Password</ion-label>
							<ion-input
								v-model="confirmPassword"
								:type="showPassword ? 'text' : 'password'"
								placeholder="Re-enter your password"
								required />
						</ion-item>

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
							<span class="pref-label">{{ allergen.name }}</span>
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
import { IonPage, IonContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonSpinner } from '@ionic/vue'
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

// Emoji per allergen name — anything fetched from the catalog that isn't
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

function handleBack(): void {
	if (step.value === 2) {
		// Account + session already exist at this point — going back just
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

	if (password.value.length < 6) {
		errorMessage.value = 'Password must be at least 6 characters.'
		return
	}
	if (password.value !== confirmPassword.value) {
		errorMessage.value = 'Passwords do not match.'
		return
	}

	isSubmitting.value = true

	try {
		await authStore.register(name.value.trim(), email.value, password.value)

		// register() doesn't return a token — log in immediately after so
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
.progress-bar {
	display: flex;
	gap: 6px;
	margin-bottom: 12px;
}
.progress-segment {
	flex: 1;
	height: 4px;
	background: #e5e7eb;
	border-radius: 2px;
}
.progress-segment--filled {
	background: #16a34a;
}
.step-label {
	font-size: 0.8rem;
	color: #6b7280;
	margin-bottom: 4px;
}
.step-label--accent {
	color: #16a34a;
	font-weight: 600;
}
.auth-title {
	font-size: 1.75rem;
	font-weight: 700;
	margin: 4px 0 4px;
}
.auth-subtitle {
	color: #6b7280;
	margin-bottom: 20px;
}
.form-field {
	--padding-start: 0;
	margin-bottom: 4px;
}
.hint-text {
	font-size: 0.8rem;
	color: #6b7280;
	margin: 2px 0 12px;
}
.password-toggle {
	cursor: pointer;
	color: #6b7280;
}
.submit-button {
	--background: #16a34a;
	--border-radius: 10px;
	font-weight: 600;
	margin-top: 16px;
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

.pref-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;
	margin-bottom: 16px;
}
.pref-card {
	border: 1px solid #e5e7eb;
	background: #ffffff;
	border-radius: 14px;
	padding: 16px 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}
.pref-card--selected {
	border-color: #16a34a;
	background: #f0fdf4;
}
.pref-emoji {
	font-size: 1.6rem;
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
	padding: 12px 0 0;
}
</style>
