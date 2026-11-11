<template>
	<ion-page>
		<ion-header class="app-header-shell">
			<AppHeader />
		</ion-header>
		<ion-content class="profile-content">
			<div v-if="isLoading" class="state-block">
				<ion-spinner name="crescent" />
				<p>Loading your profile…</p>
			</div>

			<div v-else-if="loadError" class="state-block">
				<ion-icon :icon="alertCircleOutline" size="large" color="danger" />
				<p>{{ loadError }}</p>
				<ion-button @click="fetchProfile">Try again</ion-button>
			</div>

			<template v-else>
				<div class="profile-inner">
				<!-- VIEW MODE -->
				<div v-if="!isEditing" class="profile-view-mode">
					<!-- Top Header Area -->
					<div class="header-section">
						<div class="profile-header-top">
							<div class="avatar-wrap">
								<img v-if="user.avatar_base64" :src="user.avatar_base64" alt="Profile photo" class="avatar-image" />
								<span v-else class="avatar-initial">{{ user.name.charAt(0) }}</span>
								<div class="avatar-camera-badge" @click="startEditing">
									<ion-icon :icon="cameraOutline" />
								</div>
							</div>
							<div class="header-info">
								<h1 class="user-name">{{ user.name }}</h1>
								<p class="user-email">{{ user.email }}</p>
							</div>
							<button type="button" class="edit-profile-btn" @click="startEditing">
								Edit Profile
								<ion-icon :icon="pencilOutline" class="edit-profile-btn__icon" />
							</button>
						</div>

						<!-- Religious Preference section -->
						<div v-if="halalPref" class="pref-summary">
							<p class="section-label">Religious Preference:</p>
							<div class="chip-row">
								<span class="pref-chip pref-chip--halal">Halal</span>
							</div>
						</div>

						<!-- Allergens / Allergy List section -->
						<div v-if="displayPreferences.length > 0" class="pref-summary">
							<p class="section-label">Allergens / Allergy List:</p>
							<div class="chip-row">
								<span v-for="pref in displayPreferences" :key="pref" class="pref-chip">{{ pref }}</span>
							</div>
						</div>
					</div>

					<!-- Account Information Section -->
					<div class="account-info-section">
						<p class="section-label">ACCOUNT INFORMATION</p>
						<div class="info-grid">
							<div class="info-item">
								<span class="info-label">Username</span>
								<span class="info-value">@{{ user.username || 'Not set' }}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Gender</span>
								<span class="info-value">{{ user.gender || 'Not specified' }}</span>
							</div>
							<div class="info-item">
								<span class="info-label">Birthday</span>
								<span class="info-value">{{ formatBirthday(user.birthday) }}</span>
							</div>
						</div>
					</div>

					<!-- Main Content Body -->
					<div class="main-body">
						<!-- Unified Full-Width Action Card (Settings & Log Out) -->
						<div class="action-card">
							<button type="button" class="action-row" @click="router.push('/tabs/settings')">
								<div class="action-left">
									<ion-icon :icon="settingsOutline" class="action-icon" />
									<span>Settings</span>
								</div>
								<ion-icon :icon="chevronForwardOutline" class="chevron" />
							</button>

							<button type="button" class="action-row action-row--danger" @click="handleLogout">
								<div class="action-left">
									<ion-icon :icon="logOutOutline" class="action-icon" />
									<span>Log Out</span>
								</div>
								<ion-icon :icon="chevronForwardOutline" class="chevron" />
							</button>
						</div>
					</div>
				</div>
				<!-- End VIEW MODE -->

				<!-- EDIT MODE -->
				<div v-else class="profile-edit-mode">
					<div class="edit-form-container">
						<!-- Header with Cancel button -->
						<div class="edit-form-header">
							<h2 class="edit-form-title">Edit Profile</h2>
							<button type="button" class="edit-cancel-btn" @click="cancelEditing">
								<ion-icon :icon="closeOutline" />
							</button>
						</div>

						<div v-if="saveError" class="form-error">{{ saveError }}</div>

						<!-- Avatar Edit -->
						<div class="avatar-edit-section">
							<div class="avatar-edit-wrap">
								<img v-if="form.avatarBase64" :src="form.avatarBase64" alt="Profile photo" class="avatar-image-large" />
								<span v-else class="avatar-initial avatar-initial--large">{{ (form.firstName || form.lastName || '?').charAt(0) }}</span>

								<!-- Red Remove Photo Icon -->
								<button
									v-if="form.avatarBase64"
									type="button"
									class="avatar-remove-btn"
									aria-label="Remove photo"
									@click="form.avatarBase64 = null">
									<ion-icon :icon="closeOutline" />
								</button>

								<!-- Green Camera Upload Icon -->
								<button type="button" class="avatar-upload-btn" aria-label="Upload photo" @click="avatarInputRef?.click()">
									<ion-icon :icon="cameraOutline" />
								</button>

								<input ref="avatarInputRef" type="file" accept="image/*" class="hidden-input" @change="onAvatarSelected" />
							</div>
							<p v-if="avatarError" class="form-error">{{ avatarError }}</p>
						</div>

						<!-- Name Fields (side by side) -->
						<div class="name-row">
							<div class="form-group">
								<label class="input-label">First Name</label>
								<input v-model="form.firstName" type="text" placeholder="First name" maxlength="16" class="custom-input" />
							</div>
							<div class="form-group">
								<label class="input-label">Last Name</label>
								<input v-model="form.lastName" type="text" placeholder="Last name" maxlength="25" class="custom-input" />
							</div>
						</div>
						<button type="button" class="add-middle-link" @click="showMiddleName = !showMiddleName">
							{{ showMiddleName ? '- Remove middle name' : '+ Add middle name (optional)' }}
						</button>
						<div v-if="showMiddleName" class="form-group">
							<input v-model="form.middleName" type="text" placeholder="Middle name" maxlength="21" class="custom-input" />
						</div>

						<!-- Username -->
						<div class="form-group">
							<label class="input-label">Username</label>
							<div class="custom-input-wrapper">
								<input
									v-model="form.username"
									type="text"
									placeholder="Choose a username"
									minlength="4"
									maxlength="15"
									class="custom-input"
									:class="{
										'input-error': !!usernameError || profileUsernameValidation.isAvailable === false,
										'input-success': profileUsernameValidation.isAvailable === true && !usernameError
									}"
									@input="handleProfileUsernameInput" />
								<ion-spinner v-if="profileUsernameValidation.isChecking" name="crescent" class="username-spinner" />
							</div>
							<div v-if="form.username.trim() && profileUsernameValidation.message" class="username-feedback" :class="{
								'username-feedback--checking': profileUsernameValidation.isChecking,
								'username-feedback--success': profileUsernameValidation.isAvailable === true,
								'username-feedback--error': profileUsernameValidation.isAvailable === false
							}">
								{{ profileUsernameValidation.message }}
							</div>
							<div v-else-if="usernameError" class="field-error-text">{{ usernameError }}</div>
						</div>

						<!-- Gender -->
						<div class="form-group">
							<label class="input-label">Gender</label>
							<select v-model="form.gender" class="custom-input custom-select">
								<option value="" disabled>Select gender</option>
								<option value="Male">Male</option>
								<option value="Female">Female</option>
								<option value="Other">Other</option>
								<option value="Prefer not to say">Prefer not to say</option>
							</select>
						</div>

						<!-- Birthday -->
						<div class="form-group">
							<label class="input-label">Birthday</label>
							<AppDatePicker
								v-model="form.birthday"
								:min="BIRTHDAY_MIN"
								:max="maxBirthdayDate"
								placeholder="Select your birthday"
								aria-label="Birthday"
								class="custom-input"
								:class="{ 'input-error': !!birthdayError }" />
							<div v-if="birthdayError" class="field-error-text">{{ birthdayError }}</div>
						</div>

						<!-- Email (disabled) -->
						<div class="form-group">
							<label class="input-label">Email</label>
							<input :value="form.email" type="email" disabled class="custom-input custom-input--disabled" />
						</div>

						<!-- Password -->
						<div class="form-group">
							<label class="input-label">Password</label>
							<!-- Current password — only shown when the user has an existing password and is changing it -->
							<div v-if="passwordTyped && hasPasswordSet" class="custom-input-wrapper" style="margin-bottom:10px">
								<input
									v-model="currentPassword"
									:type="showCurrentPassword ? 'text' : 'password'"
									placeholder="Current password"
									class="custom-input" />
								<ion-icon
									:icon="showCurrentPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showCurrentPassword = !showCurrentPassword" />
							</div>
							<!-- New password -->
							<div class="custom-input-wrapper">
								<input
									v-model="newPassword"
									:type="showNewPassword ? 'text' : 'password'"
									:placeholder="hasPasswordSet ? '••••••••' : 'Set a password'"
									class="custom-input"
									:class="{ 'input-error': !!newPasswordError }"
									@input="onNewPasswordInput" />
								<ion-icon
									:icon="showNewPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showNewPassword = !showNewPassword" />
							</div>
							<p v-if="newPasswordError" class="field-error-text">{{ newPasswordError }}</p>
						</div>

						<!-- Confirm password — only shown when user has started typing -->
						<div v-if="passwordTyped" class="form-group">
							<label class="input-label">Confirm Password</label>
							<div class="custom-input-wrapper">
								<input
									v-model="confirmNewPassword"
									:type="showConfirmNewPassword ? 'text' : 'password'"
									placeholder="Re-enter new password"
									class="custom-input"
									:class="{ 'input-error': !!confirmPasswordError }" />
								<ion-icon
									:icon="showConfirmNewPassword ? eyeOffOutline : eyeOutline"
									class="password-toggle"
									@click="showConfirmNewPassword = !showConfirmNewPassword" />
							</div>
							<p v-if="confirmPasswordError" class="field-error-text">{{ confirmPasswordError }}</p>
						</div>

						<!-- Password strength criteria — only shown when typing -->
						<div v-if="passwordTyped" class="pass-criteria-grid">
							<div class="criteria-item" :class="{ valid: newPassCriteria.length }">
								<ion-icon :icon="newPassCriteria.length ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
								At least 8 characters
							</div>
							<div class="criteria-item" :class="{ valid: newPassCriteria.upper }">
								<ion-icon :icon="newPassCriteria.upper ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
								1 uppercase letter (A-Z)
							</div>
							<div class="criteria-item" :class="{ valid: newPassCriteria.lower }">
								<ion-icon :icon="newPassCriteria.lower ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
								1 lowercase letter (a-z)
							</div>
							<div class="criteria-item" :class="{ valid: newPassCriteria.number }">
								<ion-icon :icon="newPassCriteria.number ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
								1 number (0-9)
							</div>
							<div class="criteria-item" :class="{ valid: newPassCriteria.special }">
								<ion-icon :icon="newPassCriteria.special ? checkmarkCircle : ellipseOutline" class="criteria-icon" />
								1 special character
							</div>
						</div>

						<!-- Halal Toggle -->
						<div class="halal-toggle-row">
							<div class="halal-toggle-label-block">
								<span class="halal-toggle-label">Halal</span>
								<span class="halal-toggle-sublabel">Religious dietary requirement</span>
							</div>
							<IonToggle v-model="form.halalPref" />
						</div>

						<!-- Allergen List -->
						<div class="allergen-section">
							<label class="input-label allergen-heading">
								Allergens / Allergy List
								<span v-if="isAtAllergenLimit" class="allergen-max-hint">(Max 5)</span>
							</label>
							<p v-if="isAtAllergenLimit" class="allergen-inline-helper">
								Maximum limit of 5 allergens reached. Uncheck an item to select another.
							</p>
							<div class="who-allergen-list">
								<label
									v-for="allergen in WHO_ALLERGENS"
									:key="allergen.value"
									class="who-allergen-item"
									:class="{ 'who-allergen-item--disabled': isAtAllergenLimit && !form.customPreferences.includes(allergen.value) }">
									<input
										type="checkbox"
										class="who-allergen-checkbox"
										:checked="form.customPreferences.includes(allergen.value)"
										:disabled="isAtAllergenLimit && !form.customPreferences.includes(allergen.value)"
										@change="toggleWhoAllergen(allergen.value)" />
									<span>{{ allergen.label }}</span>
								</label>
							</div>
						</div>

						<!-- Save Button at Bottom -->
						<button type="button" class="save-changes-btn" :disabled="isSaving || isExceedingLimit" @click="saveProfile">
							<ion-spinner v-if="isSaving" name="crescent" />
							<span>{{ isSaving ? 'Saving…' : 'Save Changes' }}</span>
						</button>
					</div>
				</div>
				<!-- End EDIT MODE -->
			</div>
		</template>

		

			<ion-toast :is-open="showSuccessToast"
				message="Profile updated successfully."
				:duration="2000"
				color="success"
				@didDismiss="showSuccessToast = false" />

			
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { IonPage, IonContent, IonHeader, IonButton, IonIcon, IonSpinner, IonToast, IonModal, IonToggle, alertController, onIonViewWillEnter } from '@ionic/vue'
import {
	alertCircleOutline,
	pencilOutline,
	settingsOutline,
	logOutOutline,
	chevronForwardOutline,
	closeOutline,
	cameraOutline,
	eyeOutline,
	eyeOffOutline,
	checkmarkCircle,
	ellipseOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError, signOutConsumer } from '@/utils/api'
import AppHeader from '@/components/AppHeader.vue'
import AppDatePicker from '@/components/AppDatePicker.vue'
import { BIRTHDAY_MIN, todayLocalISO, toISODate, ageFromISO } from '@/utils/dateUtils'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const PREF_MAX = 5

const WHO_ALLERGENS = [
	{ label: 'Cereals / Gluten', value: 'Wheat-free' },
	{ label: 'Crustaceans', value: 'Crustaceans-free' },
	{ label: 'Eggs', value: 'Eggs-free' },
	{ label: 'Fish', value: 'Fish-free' },
	{ label: 'Peanuts', value: 'Peanuts-free' },
	{ label: 'Soybeans', value: 'Soy-free' },
	{ label: 'Milk / Dairy', value: 'Milk-free' },
	{ label: 'Tree Nuts', value: 'TreeNuts-Free' },
	{ label: 'Celery', value: 'Celery-free' },
	{ label: 'Mustard', value: 'Mustard-free' },
	{ label: 'Sesame', value: 'Sesame-free' },
	{ label: 'Sulphur Dioxide / Sulphites', value: 'Sulphites-free' },
	{ label: 'Lupin', value: 'Lupin-free' },
	{ label: 'Molluscs', value: 'Molluscs-free' },
]

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024

const ALLERGEN_TAG_MAP: Record<string, string> = {
	'Gluten-free': 'Wheat',
	'Wheat-free': 'Wheat',
	'Dairy-free': 'Milk',
	'Milk-free': 'Milk',
	'Egg-free': 'Eggs',
	'Eggs-free': 'Eggs',
	'Soy-free': 'Soy',
	'Soybeans-free': 'Soy',
	'Peanut-free': 'Peanuts',
	'Peanuts-free': 'Peanuts',
	'Tree Nut-free': 'Tree Nuts',
	'TreeNuts-Free': 'Tree Nuts',
	'Crustaceans-free': 'Crustaceans',
	'Molluscs-free': 'Molluscs',
	'Sesame-free': 'Sesame',
	'Fish-free': 'Fish',
	'Mustard-free': 'Mustard',
	'Celery-free': 'Celery',
	'Sulphites-free': 'Sulphur Dioxide / Sulphites',
	'Sulphur Dioxide / Sulphites-free': 'Sulphur Dioxide / Sulphites',
	'Lupin-free': 'Lupin',
}

function deriveAllergenIds(customPreferences: string[], catalog: Allergen[]): number[] {
	const ids: number[] = []
	for (const pref of customPreferences) {
		const allergenName = ALLERGEN_TAG_MAP[pref]
		if (!allergenName) continue
		const match = catalog.find((a) => a.name === allergenName)
		if (match) ids.push(match.id)
	}
	return ids
}

function formatAllergenName(name: string): string {
	return name.replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatBirthday(birthday: string | null | undefined): string {
	if (!birthday) return 'Not set'
	// Birthday is expected in YYYY-MM-DD format
	const date = new Date(birthday)
	if (isNaN(date.getTime())) return birthday // Return as-is if invalid
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

interface Allergen {
	id: number
	name: string
	scientific_name: string
}

interface DietaryProfileDto {
	id: number
	halal_pref: boolean
	custom_preferences: string[]
}

interface UserDto {
	id: number
	name: string
	first_name: string | null
	last_name: string | null
	username: string
	gender: string
	birthday: string
	email: string
	avatar_base64: string | null
	oauth_provider: string | null
	has_password: boolean
	dietary_prof: DietaryProfileDto[]
	allergens: Allergen[]
}

interface ProfileResponse {
	success: boolean
	user: UserDto
}

const isLoading = ref(true)
const loadError = ref('')
const isSaving = ref(false)
const isEditing = ref(false)
const saveError = ref('')
const showSuccessToast = ref(false)

// ── Password change state ────────────────────────────────────────────────────
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmNewPassword = ref(false)
const passwordTyped = ref(false)
const showMiddleName = ref(false)

const hasPasswordSet = computed(() => user.value.has_password)

const newPassCriteria = computed(() => ({
	length: newPassword.value.length >= 8,
	upper: /[A-Z]/.test(newPassword.value),
	lower: /[a-z]/.test(newPassword.value),
	number: /[0-9]/.test(newPassword.value),
	special: /[^A-Za-z0-9]/.test(newPassword.value),
}))

const isNewPasswordValid = computed(() => Object.values(newPassCriteria.value).every(Boolean))

const newPasswordError = computed(() => {
	if (!passwordTyped.value || !newPassword.value) return ''
	if (!isNewPasswordValid.value) return 'Password does not meet the requirements.'
	return ''
})

const confirmPasswordError = computed(() => {
	if (!passwordTyped.value || !confirmNewPassword.value) return ''
	if (newPassword.value !== confirmNewPassword.value) return 'Passwords do not match.'
	return ''
})

function onNewPasswordInput() {
	passwordTyped.value = newPassword.value.length > 0
}

function resetPasswordFields() {
	currentPassword.value = ''
	newPassword.value = ''
	confirmNewPassword.value = ''
	showCurrentPassword.value = false
	showNewPassword.value = false
	showConfirmNewPassword.value = false
	passwordTyped.value = false
}
// ────────────────────────────────────────────────────────────────────────────

// ── Username validation ───────────────────────────────────────────────────────
const USERNAME_RE = /^[a-zA-Z0-9_]{4,15}$/
const usernameError = computed(() => {
	if (!form.username) return ''
	if (!USERNAME_RE.test(form.username.trim())) return 'Username must be 4–15 characters, letters, numbers, and underscores only.'
	return ''
})

const profileUsernameValidation = ref<{
	isChecking: boolean
	isAvailable: boolean | null
	message: string
	lastChecked: string
}>({
	isChecking: false,
	isAvailable: null,
	message: '',
	lastChecked: '',
})

let profileUsernameCheckTimeout: ReturnType<typeof setTimeout> | null = null

function handleProfileUsernameInput() {
	checkProfileUsernameAvailability(form.username)
}

async function checkProfileUsernameAvailability(value: string) {
	const trimmed = value.trim()

	if (profileUsernameCheckTimeout) clearTimeout(profileUsernameCheckTimeout)

	if (!trimmed) {
		profileUsernameValidation.value = { isChecking: false, isAvailable: null, message: '', lastChecked: '' }
		return
	}

	// If the format is invalid, skip the API call — usernameError computed handles the message.
	if (!USERNAME_RE.test(trimmed)) {
		profileUsernameValidation.value = { isChecking: false, isAvailable: null, message: '', lastChecked: '' }
		return
	}

	// If the user types back their own current username, treat it as valid without hitting the API.
	if (trimmed === initialForm.username.trim()) {
		profileUsernameValidation.value = { isChecking: false, isAvailable: null, message: '', lastChecked: trimmed }
		return
	}

	if (profileUsernameValidation.value.lastChecked === trimmed && profileUsernameValidation.value.isAvailable !== null) {
		return
	}

	profileUsernameValidation.value.isChecking = true
	profileUsernameValidation.value.message = 'Checking availability...'

	profileUsernameCheckTimeout = setTimeout(async () => {
		try {
			const response = await apiFetch<{ available: boolean; message: string; isFormatError: boolean }>(
				'/api/auth/check-username',
				{ method: 'POST', body: { username: trimmed } },
			)
			profileUsernameValidation.value = {
				isChecking: false,
				isAvailable: response.available,
				message: response.message,
				lastChecked: trimmed,
			}
		} catch (error: any) {
			profileUsernameValidation.value = {
				isChecking: false,
				isAvailable: false,
				message: error?.message || 'Could not check username availability',
				lastChecked: trimmed,
			}
		}
	}, 500)
}
// ─────────────────────────────────────────────────────────────────────────────

const allergenCatalog = ref<Allergen[]>([])

const user = ref<UserDto>({ id: 0, name: '', first_name: null, last_name: null, username: '', gender: '', birthday: '', email: '', avatar_base64: null, oauth_provider: null, has_password: false, dietary_prof: [], allergens: [] })

const avatarInputRef = ref<HTMLInputElement | null>(null)
const avatarError = ref('')

const halalPref = computed(() => user.value.dietary_prof?.[0]?.halal_pref ?? false)

const displayPreferences = computed(() => {
	const custom = user.value.dietary_prof?.[0]?.custom_preferences ?? []
	const filtered = custom.length > 0
		? custom
		: (user.value.allergens ?? []).map((a) => `${formatAllergenName(a.name)}-free`)
	return filtered.filter((p) => p.toLowerCase() !== 'halal')
})

const isExceedingLimit = computed(() => form.customPreferences.length > PREF_MAX)
const isAtAllergenLimit = computed(() => form.customPreferences.length >= PREF_MAX)

// Picker upper bound is today (local time); the under-16 rule is a validation error below.
const maxBirthdayDate = computed(() => todayLocalISO())

const birthdayError = computed(() => {
	if (!form.birthday) return ''
	const iso = toISODate(form.birthday)
	if (!iso || iso < BIRTHDAY_MIN || iso > maxBirthdayDate.value) return 'Please enter a valid birthday'
	// Only enforce the age rule when the birthday was changed, so existing accounts can still save other edits.
	if (form.birthday !== initialForm.birthday && ageFromISO(iso) < 16) return 'You must be at least 16 years old'
	return ''
})

const form = reactive({
	firstName: '',
	middleName: '',
	lastName: '',
	username: '',
	gender: '',
	birthday: '',
	email: '',
	halalPref: false,
	customPreferences: [] as string[],
	avatarBase64: null as string | null,
})

const initialForm = reactive({
	firstName: '',
	middleName: '',
	lastName: '',
	username: '',
	gender: '',
	birthday: '',
	email: '',
	halalPref: false,
	customPreferences: [] as string[],
	avatarBase64: null as string | null,
})

const hasUnsavedChanges = computed(() => {
	return (
		passwordTyped.value ||
		form.firstName !== initialForm.firstName ||
		form.middleName !== initialForm.middleName ||
		form.lastName !== initialForm.lastName ||
		form.username !== initialForm.username ||
		form.gender !== initialForm.gender ||
		form.birthday !== initialForm.birthday ||
		form.halalPref !== initialForm.halalPref ||
		JSON.stringify(form.customPreferences) !== JSON.stringify(initialForm.customPreferences) ||
		form.avatarBase64 !== initialForm.avatarBase64
	)
})

async function fetchProfile() {
	isLoading.value = true
	loadError.value = ''

	try {
		const data = await apiFetch<ProfileResponse>('/api/users', { method: 'GET' })
		user.value = data.user
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Something went wrong while loading your profile.'
	} finally {
		isLoading.value = false
	}
}

async function fetchAllergens() {
	try {
		allergenCatalog.value = await apiFetch<Allergen[]>('/api/allergen', { method: 'GET' })
	} catch (err) {
		console.error('Failed to load allergen catalog for tag mapping:', err)
	}
}

function startEditing() {
	// Use first_name/last_name from the backend directly for accuracy.
	// first_name may contain "First Middle" (concatenated during registration), so split on first space.
	const rawFirst = (user.value.first_name || user.value.name || '').trim()
	const firstParts = rawFirst.split(' ')
	form.firstName = firstParts[0] || ''
	form.middleName = firstParts.slice(1).join(' ') || ''
	form.lastName = (user.value.last_name || '').trim()

	showMiddleName.value = form.middleName.length > 0

	form.username = user.value.username || ''
	form.email = user.value.email
	form.gender = user.value.gender || ''
	form.birthday = toISODate(user.value.birthday)
	form.halalPref = halalPref.value
	form.customPreferences = [...displayPreferences.value]
	form.avatarBase64 = user.value.avatar_base64
	avatarError.value = ''
	saveError.value = ''
	profileUsernameValidation.value = { isChecking: false, isAvailable: null, message: '', lastChecked: '' }

	initialForm.firstName = form.firstName
	initialForm.middleName = form.middleName
	initialForm.lastName = form.lastName
	initialForm.username = form.username
	initialForm.email = form.email
	initialForm.gender = form.gender
	initialForm.birthday = form.birthday
	initialForm.halalPref = form.halalPref
	initialForm.customPreferences = [...form.customPreferences]
	initialForm.avatarBase64 = form.avatarBase64

	isEditing.value = true
}

async function cancelEditing() {
	if (hasUnsavedChanges.value) {
		const alert = await alertController.create({
			header: 'Unsaved Changes',
			message: 'You have not saved any changes. Are you sure you want to close without saving?',
			cssClass: 'custom-make-alert',
			buttons: [
				{ text: 'Keep Editing', role: 'cancel' },
				{
					text: 'Discard Changes',
					cssClass: 'alert-button-danger',
					handler: () => {
						isEditing.value = false
					},
				},
			],
		})
		await alert.present()
	} else {
		isEditing.value = false
	}
}

function onAvatarSelected(event: Event) {
	avatarError.value = ''
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''

	if (!file) return

	if (!file.type.startsWith('image/')) {
		avatarError.value = 'Please select an image file.'
		return
	}
	if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
		avatarError.value = 'Image is too large. Please choose a photo under 5MB.'
		return
	}

	const reader = new FileReader()
	reader.onload = () => {
		form.avatarBase64 = reader.result as string
	}
	reader.onerror = () => {
		avatarError.value = 'Failed to read the selected file. Please try again.'
	}
	reader.readAsDataURL(file)
}

function toggleWhoAllergen(value: string) {
	if (form.customPreferences.includes(value)) {
		form.customPreferences = form.customPreferences.filter((p) => p !== value)
	} else {
		if (form.customPreferences.length >= PREF_MAX) {
			// At the cap — unselected items are disabled in the UI, so this is a
			// defensive no-op. No toast (replaced by inline helper + disabled state).
			return
		}
		form.customPreferences.push(value)
	}
}

async function saveProfile() {
	if (isExceedingLimit.value) return
	if (birthdayError.value) {
		saveError.value = birthdayError.value
		return
	}
	if (usernameError.value) {
		saveError.value = usernameError.value
		return
	}
	if (profileUsernameValidation.value.isChecking) {
		saveError.value = 'Still checking username availability. Please wait a moment and try again.'
		return
	}
	if (profileUsernameValidation.value.isAvailable === false) {
		return
	}
	// Validate password fields if the user has started typing a new password.
	if (passwordTyped.value) {
		if (!isNewPasswordValid.value) {
			saveError.value = 'Password does not meet the requirements.'
			return
		}
		if (newPassword.value !== confirmNewPassword.value) {
			saveError.value = 'Passwords do not match.'
			return
		}
		if (hasPasswordSet.value && !currentPassword.value) {
			saveError.value = 'Please enter your current password.'
			return
		}
	}

	isSaving.value = true
	saveError.value = ''

	try {
		// If the user is changing their password, do that first.
		if (passwordTyped.value) {
			await apiFetch('/api/users/password', {
				method: 'PUT',
				body: {
					current_password: currentPassword.value,
					new_password: newPassword.value,
				},
			})
			// The password is saved now. Clear the fields straight away so a later
			// profile-save error can't make a retry re-send the old current password.
			resetPasswordFields()
			user.value.has_password = true
		}

		const data = await apiFetch<ProfileResponse>('/api/users', {
			method: 'PUT',
			body: {
				first_name: [form.firstName, form.middleName].filter(Boolean).join(' ').trim(),
				last_name: form.lastName.trim(),
				name: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ').trim(),
				username: form.username,
				gender: form.gender,
				birthday: form.birthday,
				halal_pref: form.halalPref,
				custom_preferences: form.customPreferences,
				allergen_ids: deriveAllergenIds(form.customPreferences, allergenCatalog.value),
				avatar_base64: form.avatarBase64,
			},
		})

		user.value = data.user
		// Keep the auth store (used by the desktop sidebar) in sync with the new photo
		if (authStore.user) authStore.user.avatar_base64 = data.user.avatar_base64
		resetPasswordFields()
		showMiddleName.value = false
		isEditing.value = false
		showSuccessToast.value = true
	} catch (err) {
		saveError.value = err instanceof ApiError ? err.message : 'Something went wrong while saving.'
	} finally {
		isSaving.value = false
	}
}

async function handleLogout() {
	const alert = await alertController.create({
		header: 'Log Out',
		message: 'Are you sure you want to log out?',
		cssClass: 'custom-make-alert',
		buttons: [
			{ text: 'Cancel', role: 'cancel', cssClass: 'alert-button-cancel' },
			{
				text: 'Log Out',
				role: 'destructive',
				cssClass: 'alert-button-danger',
				handler: async () => {
					try {
						await signOutConsumer()
					} catch {
						/* ignore */
					}
					window.location.href = 'https://omniscan.website'
				},
			},
		],
	})
	await alert.present()
}

function loadData() {
	fetchProfile()
	fetchAllergens()
}

onMounted(() => {
	loadData()
})

onIonViewWillEnter(() => {
	loadData()
})

onBeforeRouteLeave(async (to, from, next) => {
	if (isEditing.value && hasUnsavedChanges.value) {
		const alert = await alertController.create({
			header: 'Unsaved Changes',
			message: 'You have not saved any changes. Are you sure you want to leave without saving?',
			cssClass: 'custom-make-alert',
			buttons: [
				{
					text: 'Keep Editing',
					role: 'cancel',
					handler: () => next(false),
				},
				{
					text: 'Discard Changes',
					cssClass: 'alert-button-danger',
					handler: () => {
						isEditing.value = false
						resetPasswordFields()
						showMiddleName.value = false
						next()
					},
				},
			],
		})
		await alert.present()
	} else {
		next()
	}
})
</script>

<style scoped>
.app-header-shell {
	--background: #ffffff;
}
.app-header-shell::after {
	display: none; /* remove Ionic's default header bottom shadow line */
}
.profile-content {
	--background: #f8fafc;
	--overflow: hidden;
}

.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 48px 16px;
	text-align: center;
}

.profile-inner {
	max-width: 800px;
	margin: 0 auto;
	width: 100%;
	padding: 24px 16px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.header-section {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 16px;
	padding: 24px;
	width: 100%;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

:global(html.ion-palette-dark) :global(body.dark) {
	.header-section {
		background: #1e293b;
		border-color: #334155;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}
}

.profile-header-top {
	display: flex;
	align-items: center;
	gap: 16px;
}

.avatar-wrap {
	position: relative;
	width: 72px;
	height: 72px;
	border-radius: 50%;
	background: #f3f4f6;
	flex-shrink: 0;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.avatar-wrap {
		background: #334155;
	}
}

.avatar-image {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	object-fit: cover;
}

.avatar-initial {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	font-size: 1.75rem;
	font-weight: 700;
	color: #9ca3af;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.avatar-initial {
		color: #64748b;
	}
}

.avatar-camera-badge {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 24px;
	height: 24px;
	background-color: #10b981;
	border: 2px solid #ffffff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ffffff;
	font-size: 12px;
	cursor: pointer;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.avatar-camera-badge {
		border-color: #1e293b;
	}
}

.header-info {
	flex: 1;
	min-width: 0;
	padding-top: 4px;
}

.user-name {
	font-size: 1.4rem;
	font-weight: 700;
	color: #0f172a;
	margin: 0;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.user-name {
		color: #f8fafc;
	}
}

.user-email {
	font-size: 0.85rem;
	color: #64748b;
	margin: 4px 0 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.user-email {
		color: #94a3b8;
	}
}

.edit-profile-btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: transparent;
	border: 1px solid var(--ion-color-medium, #9ca3af);
	border-radius: 10px;
	padding: 7px 14px;
	font-size: 0.85rem;
	font-weight: 600;
	color: var(--ion-text-color, #0f172a);
	cursor: pointer;
	white-space: nowrap;
	flex-shrink: 0;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.edit-profile-btn {
		color: #f8fafc;
		border-color: #475569;
	}
	
	.edit-profile-btn:hover {
		background-color: rgba(71, 85, 105, 0.2);
	}
}

.edit-profile-btn__icon {
	color: #10b981;
	font-size: 1rem;
}

.pref-summary {
	margin-top: 24px;
}

.section-label {
	font-size: 0.825rem;
	color: #64748b;
	margin: 0 0 10px;
	font-weight: 500;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.section-label {
		color: #94a3b8;
	}
}

.chip-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.pref-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: #dcfce7;
	color: #059669;
	border-radius: 999px;
	padding: 6px 14px;
	font-size: 0.85rem;
	font-weight: 500;
}

.pref-chip--halal {
	background: #fef3c7;
	color: #92400e;
}

.main-body {
	width: 100%;
}

.action-card {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 16px;
	overflow: hidden;
	width: 100%;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

:global(html.ion-palette-dark) :global(body.dark) {
	.action-card {
		background: #1e293b;
		border-color: #334155;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}
}

.action-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 16px 20px;
	background: none;
	border: none;
	border-bottom: 1px solid #f3f4f6;
	cursor: pointer;
	text-align: left;
	font-size: 0.95rem;
	font-weight: 600;
	color: #0f172a;
	transition: background-color 0.15s ease;
}

.action-row:last-child {
	border-bottom: none;
}

.action-row:hover {
	background-color: #f9fafb;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.action-row {
		color: #f8fafc;
		border-bottom-color: #334155;
	}
	
	.action-row:hover {
		background-color: #334155;
	}
}

.action-left {
	display: flex;
	align-items: center;
	gap: 12px;
}

.action-icon {
	font-size: 1.25rem;
	color: #334155;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.action-icon {
		color: #94a3b8;
	}
}

.action-row--danger {
	color: #ef4444;
}

.action-row--danger .action-icon {
	color: #ef4444;
}

.action-row .chevron {
	color: #94a3b8;
	font-size: 1rem;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.action-row .chevron {
		color: #64748b;
	}
}

/* Account Info Section */
.account-info-section {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 16px;
	padding: 20px;
	margin-bottom: 20px;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

:global(html.ion-palette-dark) :global(body.dark) {
	.account-info-section {
		background: #1e293b;
		border-color: #334155;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}
}

.info-grid {
	display: grid;
	gap: 12px;
	margin-top: 12px;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 0;
	border-bottom: 1px solid #f3f4f6;
}

.info-item:last-child {
	border-bottom: none;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.info-item {
		border-bottom-color: #334155;
	}
}

.info-label {
	font-size: 0.875rem;
	color: #64748b;
	font-weight: 500;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.info-label {
		color: #94a3b8;
	}
}

.info-value {
	font-size: 0.875rem;
	color: #0f172a;
	font-weight: 600;
	text-align: right;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.info-value {
		color: #f8fafc;
	}
}

/* Edit Mode Styles */
.profile-edit-mode {
	width: 100%;
}

.edit-form-container {
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 16px;
	padding: 24px;
	max-width: 600px;
	margin: 0 auto;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

:global(html.ion-palette-dark) :global(body.dark) {
	.edit-form-container {
		background: #1e293b;
		border-color: #334155;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}
}

.edit-form-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24px;
	padding-bottom: 16px;
	border-bottom: 1px solid #e5e7eb;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.edit-form-header {
		border-bottom-color: #334155;
	}
}

.edit-form-title {
	font-size: 1.5rem;
	font-weight: 700;
	color: #0f172a;
	margin: 0;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.edit-form-title {
		color: #f8fafc;
	}
}

.edit-cancel-btn {
	background: transparent;
	border: none;
	font-size: 1.5rem;
	color: #64748b;
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	transition: color 0.2s;
}

.edit-cancel-btn:hover {
	color: #0f172a;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.edit-cancel-btn {
		color: #94a3b8;
	}
	
	.edit-cancel-btn:hover {
		color: #f8fafc;
	}
}

.avatar-edit-section {
	text-align: center;
	margin-bottom: 24px;
}

.avatar-edit-wrap {
	position: relative;
	width: 100px;
	height: 100px;
	margin: 0 auto 16px;
}

.avatar-image-large {
	width: 100px;
	height: 100px;
	border-radius: 50%;
	object-fit: cover;
}

.avatar-initial--large {
	width: 100px;
	height: 100px;
	border-radius: 50%;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 2.5rem;
	font-weight: 700;
	color: #9ca3af;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.avatar-initial--large {
		background: #334155;
		color: #64748b;
	}
}

.avatar-remove-btn {
	position: absolute;
	top: 0;
	right: 0;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: #ef4444;
	color: #ffffff;
	border: 2px solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	font-size: 0.9rem;
	z-index: 2;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.avatar-remove-btn {
		border-color: #1e293b;
	}
}

.avatar-upload-btn {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: #10b981;
	color: #ffffff;
	border: 2px solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	z-index: 1;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.avatar-upload-btn {
		border-color: #1e293b;
	}
}

.hidden-input {
	display: none;
}

.name-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
	margin-bottom: 16px;
}

.form-group {
	margin-bottom: 16px;
}

.input-label {
	display: block;
	font-size: 0.875rem;
	font-weight: 600;
	color: #475569;
	margin-bottom: 6px;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.input-label {
		color: #94a3b8;
	}
}

.custom-input.input-error {
	border-color: #dc2626;
}

/* Password field with eye toggle — mirrors RegisterPage */
.custom-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.custom-input-wrapper .custom-input {
	padding-right: 44px;
}

.password-toggle {
	position: absolute;
	right: 14px;
	font-size: 1.1rem;
	color: #6b7280;
	cursor: pointer;
}

.pass-criteria-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin: -4px 0 14px; padding: 12px 14px; background: #f9fafb; border-radius: 10px; }
.criteria-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #9ca3af; }
.criteria-item.valid { color: #15803d; }
.criteria-icon { width: 16px; height: 16px; flex-shrink: 0; color: #d1d5db; }
.criteria-item.valid .criteria-icon { color: #15803d; }

:global(html.ion-palette-dark) .pass-criteria-grid { background: #1e293b; }
:global(html.ion-palette-dark) .password-toggle { color: #94a3b8; }

.field-error-text {
	margin-top: 6px;
	font-size: 0.8rem;
	color: #dc2626;
}

.username-spinner {
	position: absolute;
	right: 14px;
	width: 16px;
	height: 16px;
	color: #6b7280;
}

.username-feedback {
	font-size: 0.8rem;
	margin-top: 6px;
	padding: 6px 10px;
	border-radius: 6px;
	border: 1px solid transparent;
}

.username-feedback--checking {
	color: #6b7280;
	background: #f3f4f6;
}

.username-feedback--success {
	color: #15803d;
	background: #f0fdf4;
	border-color: #bbf7d0;
}

.username-feedback--error {
	color: #b91c1c;
	background: #fee2e2;
	border-color: #fecaca;
}

.input-success {
	border-color: #22c55e !important;
}

.custom-input {
	width: 100%;
	height: 46px;
	background-color: #ffffff;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 0 14px;
	font-size: 0.95rem;
	color: #0f172a;
	outline: none;
	box-sizing: border-box;
	transition: border-color 0.2s;
}

.custom-input:focus {
	border-color: #10b981;
}

.custom-input::placeholder {
	color: #94a3b8;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.custom-input {
		background-color: #0f172a;
		border-color: #334155;
		color: #f8fafc;
	}
	
	.custom-input:focus {
		border-color: #10b981;
	}
	
	.custom-input::placeholder {
		color: #64748b;
	}
}

.custom-input--disabled {
	background-color: #f9fafb;
	color: #64748b;
	cursor: not-allowed;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.custom-input--disabled {
		background-color: #1e293b;
		color: #64748b;
		border-color: #334155;
	}
}

.custom-select {
	appearance: none;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 14px center;
	background-size: 12px;
	padding-right: 40px;
	cursor: pointer;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.custom-select {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
	}
}

.input-helper {
	font-size: 0.75rem;
	color: #64748b;
	margin: 6px 0 0;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.input-helper {
		color: #94a3b8;
	}
}

.halal-toggle-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0;
	border-top: 1px solid #e2e8f0;
	border-bottom: 1px solid #e2e8f0;
	margin-bottom: 20px;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.halal-toggle-row {
		border-top-color: #334155;
		border-bottom-color: #334155;
	}
}

.halal-toggle-label-block {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.halal-toggle-label {
	font-size: 0.95rem;
	font-weight: 600;
	color: #1e293b;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.halal-toggle-label {
		color: #f8fafc;
	}
}

.halal-toggle-sublabel {
	font-size: 0.8rem;
	color: #64748b;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.halal-toggle-sublabel {
		color: #94a3b8;
	}
}

.allergen-section {
	margin-bottom: 24px;
}

.allergen-heading {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 12px;
}

.allergen-max-hint {
	font-size: 0.75rem;
	font-weight: 600;
	color: #d97706;
	background: #fef3c7;
	padding: 2px 10px;
	border-radius: 9999px;
}

.allergen-inline-helper {
	font-size: 0.8rem;
	color: #92400e;
	background: #fffbeb;
	border: 1px solid #fde68a;
	border-radius: 8px;
	padding: 10px 12px;
	margin: 8px 0 16px;
	line-height: 1.4;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.allergen-inline-helper {
		color: #fbbf24;
		background: rgba(217, 119, 6, 0.1);
		border-color: rgba(217, 119, 6, 0.3);
	}
}

.who-allergen-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.who-allergen-item {
	display: flex;
	align-items: center;
	gap: 12px;
	font-size: 0.875rem;
	color: #334155;
	cursor: pointer;
	padding: 8px 12px;
	border-radius: 8px;
	transition: background-color 0.15s;
}

.who-allergen-item:hover:not(.who-allergen-item--disabled) {
	background-color: #f9fafb;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.who-allergen-item {
		color: #f8fafc;
	}
	
	.who-allergen-item:hover:not(.who-allergen-item--disabled) {
		background-color: rgba(51, 65, 85, 0.5);
	}
}

.who-allergen-checkbox {
	appearance: none;
	-webkit-appearance: none;
	width: 20px;
	height: 20px;
	border: 2px solid #cbd5e1;
	border-radius: 5px;
	background-color: #ffffff;
	outline: none;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: all 0.2s;
}

.who-allergen-checkbox:checked {
	background-color: #00b050;
	border-color: #00b050;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
	background-size: 14px 14px;
	background-position: center;
	background-repeat: no-repeat;
}

.who-allergen-item--disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.who-allergen-checkbox:disabled {
	cursor: not-allowed;
	background-color: #f1f5f9;
	border-color: #e2e8f0;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.who-allergen-checkbox {
		background-color: #0f172a;
		border-color: #475569;
	}
	
	.who-allergen-checkbox:disabled {
		background-color: #1e293b;
		border-color: #334155;
	}

	/* Keep brand green when checked in dark mode (must come after the dark default above) */
	.who-allergen-checkbox:checked,
	.who-allergen-checkbox:checked:disabled {
		background-color: #00b050 !important;
		border-color: #00b050 !important;
	}
}

.save-changes-btn {
	width: 100%;
	height: 50px;
	background: #00b050;
	color: #ffffff;
	border: none;
	border-radius: 12px;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	transition: background 0.2s;
}

.save-changes-btn:hover:not(:disabled) {
	background: #009944;
}

.save-changes-btn:disabled {
	background: #9ca3af;
	cursor: not-allowed;
	opacity: 0.7;
}

.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 10px 14px;
	margin-bottom: 16px;
	font-size: 0.875rem;
	line-height: 1.4;
}

:global(html.ion-palette-dark) :global(body.dark) {
	.form-error {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
}

@media (min-width: 768px) {
	.profile-inner {
		padding: 32px 24px;
	}
}
</style>

<style>
.profile-content::part(scroll) {
	overflow-y: auto;
}
.profile-content::part(scroll)::-webkit-scrollbar {
	display: none;
}

ion-modal.custom-edit-modal {
	--height: 90%;
	--width: 90%;
	--max-width: 400px;
	--border-radius: 20px;
	--background: transparent;
	--box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.custom-edit-modal .modal-card {
	background: #ffffff;
	border-radius: 20px;
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.custom-edit-modal .modal-header-sticky {
	padding: 24px 20px 16px;
	flex-shrink: 0;
}

.custom-edit-modal .modal-scroll-body {
	flex: 1;
	overflow-y: auto;
	padding: 0 20px 40px;
	-webkit-overflow-scrolling: touch;
}

.custom-edit-modal .modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
}

.custom-edit-modal .modal-title {
	font-size: 1.25rem;
	font-weight: 700;
	color: #0f172a;
	margin: 0;
}

.custom-edit-modal .modal-close-btn {
	background: transparent;
	border: none;
	font-size: 1.25rem;
	color: #64748b;
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
}

.custom-edit-modal .avatar-edit-wrap {
	position: relative;
	width: 88px;
	height: 88px;
	margin: 0 auto 20px;
}

.custom-edit-modal .avatar-image-large {
	width: 88px;
	height: 88px;
	border-radius: 50%;
	object-fit: cover;
}

.custom-edit-modal .avatar-initial--large {
	width: 88px;
	height: 88px;
	border-radius: 50%;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 2rem;
	font-weight: 700;
	color: #9ca3af;
}

.custom-edit-modal .avatar-remove-btn {
	position: absolute;
	top: 0;
	right: 0;
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: #ef4444;
	color: #ffffff;
	border: 2px solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	font-size: 0.8rem;
	z-index: 2;
}

.custom-edit-modal .avatar-upload-btn {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: #10b981;
	color: #ffffff;
	border: 2px solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	z-index: 1;
}

.custom-edit-modal .hidden-input {
	display: none;
}

.custom-edit-modal .input-group {
	margin-bottom: 16px;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.custom-edit-modal .input-label {
	font-size: 0.85rem;
	font-weight: 500;
	color: #475569;
}

.custom-edit-modal .custom-input {
	width: 100%;
	height: 44px;
	background-color: #ffffff !important;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 0 14px;
	font-size: 0.95rem;
	color: #0f172a !important;
	outline: none;
	box-sizing: border-box;
	-webkit-appearance: none;
	appearance: none;
}

.custom-edit-modal .custom-input::placeholder {
	color: #94a3b8;
}

.custom-edit-modal .custom-input:-webkit-autofill,
.custom-edit-modal .custom-input:-webkit-autofill:hover,
.custom-edit-modal .custom-input:-webkit-autofill:focus {
	-webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
	-webkit-text-fill-color: #0f172a !important;
}

.custom-edit-modal .custom-input:focus {
	border-color: #10b981;
}

.custom-edit-modal .custom-input--disabled {
	background-color: #ffffff !important;
	color: #64748b !important;
}

.custom-edit-modal .save-changes-btn {
	width: 100%;
	height: 48px;
	background: #00b050;
	color: #ffffff;
	border: none;
	border-radius: 12px;
	font-size: 1rem;
	font-weight: 600;
	margin-top: 24px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}

.custom-edit-modal .save-changes-btn:disabled {
	background: #9ca3af;
	cursor: not-allowed;
	opacity: 0.7;
}

.custom-edit-modal .form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 0.85rem;
}

.custom-edit-modal .pref-limit-warning {
	color: #d97706;
	font-size: 0.78rem;
	margin: 4px 0 8px;
}

.custom-edit-modal .halal-toggle-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 0;
	border-bottom: 1px solid #e2e8f0;
	margin-bottom: 12px;
}

.custom-edit-modal .halal-toggle-label-block {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.custom-edit-modal .halal-toggle-label {
	font-size: 0.9rem;
	font-weight: 600;
	color: #1e293b;
}

.custom-edit-modal .halal-toggle-sublabel {
	font-size: 0.76rem;
	color: #64748b;
}

.custom-edit-modal .who-allergen-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-top: 8px;
	margin-bottom: 16px;
}

.custom-edit-modal .who-allergen-item {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 0.875rem;
	color: #334155;
	cursor: pointer;
}

.custom-edit-modal .who-allergen-checkbox {
	appearance: none;
	-webkit-appearance: none;
	width: 18px;
	height: 18px;
	border: 1.5px solid #cbd5e1;
	border-radius: 4px;
	background-color: #ffffff;
	outline: none;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: background-color 0.2s, border-color 0.2s;
}

.custom-edit-modal .who-allergen-checkbox:checked {
	background-color: #00b050;
	border-color: #00b050;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
	background-size: 12px 12px;
	background-position: center;
	background-repeat: no-repeat;
}

.custom-edit-modal .who-allergen-item--disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.custom-edit-modal .who-allergen-checkbox:disabled {
	cursor: not-allowed;
	background-color: #f1f5f9;
	border-color: #e2e8f0;
}

.custom-edit-modal .allergen-heading {
	display: flex;
	align-items: center;
	gap: 8px;
}

.custom-edit-modal .allergen-max-hint {
	font-size: 0.72rem;
	font-weight: 600;
	color: #d97706;
	background: #fef3c7;
	padding: 2px 8px;
	border-radius: 9999px;
}

.custom-edit-modal .allergen-inline-helper {
	font-size: 0.76rem;
	color: #92400e;
	background: #fffbeb;
	border: 1px solid #fde68a;
	border-radius: 8px;
	padding: 8px 10px;
	margin: 6px 0 4px;
	line-height: 1.4;
}

html.ion-palette-dark .username-feedback--checking { background: #1f2937; color: #9ca3af; }
html.ion-palette-dark .username-feedback--success { background: #14532d; color: #86efac; border-color: #166534; }
html.ion-palette-dark .username-feedback--error { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
</style>