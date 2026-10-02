<template>
	<ion-page>
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
					<!-- Top Header Area -->
					<div class="header-section">
						<div class="profile-header-top">
							<div class="avatar-wrap">
								<img v-if="user.avatar_base64" :src="user.avatar_base64" alt="Profile photo" class="avatar-image" />
								<span v-else class="avatar-initial">{{ user.name.charAt(0) }}</span>
								<div class="avatar-camera-badge" @click="openEditModal">
									<ion-icon :icon="cameraOutline" />
								</div>
							</div>
							<div class="header-info">
								<h1 class="user-name">{{ user.name }}</h1>
								<p class="user-email">{{ user.email }}</p>
							</div>
							<button type="button" class="edit-profile-btn" @click="openEditModal">
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
			</template>

			<ion-toast
				:is-open="showSuccessToast"
				message="Profile updated successfully."
				:duration="2000"
				color="success"
				@didDismiss="showSuccessToast = false" />

			<!-- Floating Edit Profile Modal -->
			<ion-modal
				:is-open="isEditModalOpen"
				:backdrop-dismiss="false"
				class="custom-edit-modal"
				@didDismiss="handleModalDismiss">
				<div class="modal-card">
					<!-- Modal Header -->
					<div class="modal-header-sticky">
						<div class="modal-header">
							<h2 class="modal-title">Edit Profile</h2>
							<button type="button" class="modal-close-btn" @click="attemptCloseModal">
								<ion-icon :icon="closeOutline" />
							</button>
						</div>
					</div>

					<!-- Scrollable Body -->
					<div class="modal-scroll-body">
						<div v-if="saveError" class="form-error">{{ saveError }}</div>

						<!-- Avatar Edit -->
						<div class="avatar-edit-wrap">
							<img v-if="form.avatarBase64" :src="form.avatarBase64" alt="Profile photo" class="avatar-image-large" />
							<span v-else class="avatar-initial avatar-initial--large">{{ form.name.charAt(0) || '?' }}</span>

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

						<!-- Form Fields -->
						<div class="input-group">
							<label class="input-label">Name</label>
							<input v-model="form.name" type="text" placeholder="Your name" class="custom-input" />
						</div>

						<div class="input-group">
							<label class="input-label">Email</label>
							<input :value="form.email" type="email" disabled class="custom-input custom-input--disabled" />
						</div>

						<!-- Dietary Preferences Edit -->
						<div class="halal-toggle-row">
							<div class="halal-toggle-label-block">
								<span class="halal-toggle-label">Halal</span>
								<span class="halal-toggle-sublabel">Religious dietary requirement</span>
							</div>
							<IonToggle v-model="form.halalPref" />
						</div>

						<p v-if="prefLimitWarning" class="pref-limit-warning">You can select up to 5 allergens / allergies.</p>
						<label class="input-label" style="margin-top: 16px;">Allergens / Allergy List</label>
						<div class="who-allergen-list">
							<label v-for="allergen in WHO_ALLERGENS" :key="allergen.value" class="who-allergen-item">
								<input
									type="checkbox"
									class="who-allergen-checkbox"
									:checked="form.customPreferences.includes(allergen.value)"
									@change="toggleWhoAllergen(allergen.value)" />
								<span>{{ allergen.label }}</span>
							</label>
						</div>

						<button type="button" class="save-changes-btn" :disabled="isSaving" @click="saveProfile">
							<ion-spinner v-if="isSaving" name="crescent" />
							<span>{{ isSaving ? 'Saving…' : 'Save Changes' }}</span>
						</button>
					</div>
				</div>
			</ion-modal>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner, IonToast, IonModal, IonToggle, alertController, onIonViewWillEnter } from '@ionic/vue'
import {
	alertCircleOutline,
	pencilOutline,
	settingsOutline,
	logOutOutline,
	chevronForwardOutline,
	closeOutline,
	cameraOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const PREF_MAX = 5

const WHO_ALLERGENS = [
	{ label: 'Cereals / Gluten', value: 'Wheat-free' },
	{ label: 'Crustaceans', value: 'Shellfish-free' },
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
	'Dairy-free': 'Milk',
	'Egg-free': 'Eggs',
	'Soy-free': 'Soy',
	'Peanut-free': 'Peanuts',
	'Peanuts-free': 'Peanuts',
	'Milk-free': 'Milk',
	'Eggs-free': 'Eggs',
	'Wheat-free': 'Wheat',
	'Tree Nut-free': 'Tree Nuts',
	'TreeNuts-Free': 'Tree Nuts',
	'Shellfish-free': 'Shellfish',
	'Sesame-free': 'Sesame',
	'Fish-free': 'Fish',
	'Mustard-free': 'Mustard',
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
	email: string
	avatar_base64: string | null
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
const saveError = ref('')
const showSuccessToast = ref(false)
const prefLimitWarning = ref(false)

const allergenCatalog = ref<Allergen[]>([])

const user = ref<UserDto>({ id: 0, name: '', email: '', avatar_base64: null, dietary_prof: [], allergens: [] })

const isEditModalOpen = ref(false)
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

const prefTotal = computed(() => form.customPreferences.length + (form.halalPref ? 1 : 0))

const form = reactive({
	name: '',
	email: '',
	halalPref: false,
	customPreferences: [] as string[],
	avatarBase64: null as string | null,
})

const initialForm = reactive({
	name: '',
	email: '',
	halalPref: false,
	customPreferences: [] as string[],
	avatarBase64: null as string | null,
})

const hasUnsavedChanges = computed(() => {
	return (
		form.name !== initialForm.name ||
		form.email !== initialForm.email ||
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

function openEditModal() {
	form.name = user.value.name
	form.email = user.value.email
	form.halalPref = halalPref.value
	form.customPreferences = [...displayPreferences.value]
	form.avatarBase64 = user.value.avatar_base64
	avatarError.value = ''
	saveError.value = ''
	prefLimitWarning.value = false

	initialForm.name = form.name
	initialForm.email = form.email
	initialForm.halalPref = form.halalPref
	initialForm.customPreferences = [...form.customPreferences]
	initialForm.avatarBase64 = form.avatarBase64

	isEditModalOpen.value = true
}

async function attemptCloseModal() {
	if (hasUnsavedChanges.value) {
		const alert = await alertController.create({
			header: 'Unsaved Changes',
			message: 'You have not saved any changes. Are you sure you want to close without saving?',
			cssClass: 'custom-make-alert',
			buttons: [
				{ text: 'Keep Editing', role: 'cancel', cssClass: 'alert-button-cancel' },
				{
					text: 'Discard Changes',
					cssClass: 'alert-button-danger',
					handler: () => {
						isEditModalOpen.value = false
					},
				},
			],
		})
		await alert.present()
	} else {
		isEditModalOpen.value = false
	}
}

function handleModalDismiss() {
	if (isEditModalOpen.value) {
		attemptCloseModal()
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
		prefLimitWarning.value = false
	} else {
		if (prefTotal.value >= PREF_MAX) {
			prefLimitWarning.value = true
			return
		}
		form.customPreferences.push(value)
	}
}

async function saveProfile() {
	isSaving.value = true
	saveError.value = ''

	try {
		const data = await apiFetch<ProfileResponse>('/api/users', {
			method: 'PUT',
			body: {
				name: form.name,
				halal_pref: form.halalPref,
				custom_preferences: form.customPreferences,
				allergen_ids: deriveAllergenIds(form.customPreferences, allergenCatalog.value),
				avatar_base64: form.avatarBase64,
			},
		})

		user.value = data.user
		isEditModalOpen.value = false
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
				handler: () => {
					authStore.logout()
					router.replace('/')
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
</script>

<style scoped>
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

.user-email {
	font-size: 0.85rem;
	color: #64748b;
	margin: 4px 0 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
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

@media (prefers-color-scheme: dark) {
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
</style>