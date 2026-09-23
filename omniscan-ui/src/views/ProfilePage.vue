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

					<!-- Dietary preference summary -->
					<div v-if="halalPref || displayPreferences.length > 0" class="pref-summary">
						<p class="section-label">Dietary Preferences:</p>
						<div class="chip-row">
							<span v-if="halalPref" class="pref-chip">Halal</span>
							<span v-for="pref in displayPreferences" :key="pref" class="pref-chip">{{ pref }}</span>
						</div>
					</div>
				</div>

				<!-- Main Content Body -->
				<div class="main-body">
					<!-- Action rows -->
					<div class="action-list">
						<button type="button" class="action-row" @click="router.push('/tabs/settings')">
							<ion-icon :icon="settingsOutline" class="action-icon" />
							<span>Settings</span>
							<ion-icon :icon="chevronForwardOutline" class="chevron" />
						</button>
						<button type="button" class="action-row action-row--danger" @click="handleLogout">
							<ion-icon :icon="logOutOutline" class="action-icon" />
							<span>Log Out</span>
							<ion-icon :icon="chevronForwardOutline" class="chevron" />
						</button>
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
			<ion-modal :is-open="isEditModalOpen" class="custom-edit-modal" @didDismiss="closeEditModal">
				<div class="modal-card">
					<!-- Modal Header -->
					<div class="modal-header">
						<h2 class="modal-title">Edit Profile</h2>
						<button type="button" class="modal-close-btn" @click="closeEditModal">
							<ion-icon :icon="closeOutline" />
						</button>
					</div>

					<div class="modal-body">
						<div v-if="saveError" class="form-error">{{ saveError }}</div>

						<!-- Avatar Edit -->
						<div class="avatar-edit-wrap">
							<img v-if="form.avatarBase64" :src="form.avatarBase64" alt="Profile photo" class="avatar-image-large" />
							<span v-else class="avatar-initial avatar-initial--large">{{ form.name.charAt(0) || '?' }}</span>
							<button type="button" class="avatar-upload-btn" @click="avatarInputRef?.click()">
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
						<label class="input-label">Dietary Preferences</label>
						<div class="chip-row chip-row--editable">
							<span v-if="form.halalPref" class="pref-chip">
								Halal
								<ion-icon :icon="closeOutline" class="chip-remove" @click="removeHalalPref()" />
							</span>
							<span v-for="pref in form.customPreferences" :key="pref" class="pref-chip">
								{{ pref }}
								<ion-icon :icon="closeOutline" class="chip-remove" @click="removeCustomPreference(pref)" />
							</span>
						</div>

						<div class="custom-pref-input-row">
							<input
								v-model="customPrefDraft"
								type="text"
								placeholder="Type a custom preference…"
								class="custom-input pref-text-input"
								@keyup.enter="addCustomPreference"
								@input="prefAddError = null" />
							<button type="button" class="add-btn" :disabled="!customPrefDraft.trim()" @click="addCustomPreference">+ Add</button>
						</div>
						<p v-if="prefAddError" class="pref-add-error">{{ prefAddError }}</p>

						<p class="quick-add-label">Quick add:</p>
						<div class="chip-row">
							<button
								v-for="suggestion in quickAddSuggestions"
								:key="suggestion"
								type="button"
								class="quick-add-chip"
								:disabled="suggestion === 'Halal' ? form.halalPref : form.customPreferences.includes(suggestion)"
								@click="handleQuickAdd(suggestion)">
								+ {{ suggestion }}
							</button>
						</div>
						<p v-if="prefLimitWarning" class="pref-limit-warning">You can select up to 5 dietary preferences.</p>

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
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner, IonToast, IonModal, onIonViewWillEnter } from '@ionic/vue'
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

const NON_CONSUMABLE_TERMS: string[] = [
	'shampoo', 'lotion', 'soap', 'perfume', 'conditioner',
	'moisturiser', 'moisturizer', 'lipstick', 'mascara',
	'foundation', 'serum', 'toner', 'sunscreen',
	'bleach', 'detergent', 'disinfectant', 'polish',
	'cleaner', 'wax',
	'plastic', 'metal', 'fabric', 'electronics',
	'medication', 'drug', 'pill', 'tablet', 'capsule', 'supplement',
]

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024

const quickAddSuggestions = [
	'Peanuts-free',
	'Milk-free',
	'Eggs-free',
	'Wheat-free',
	'Soy-free',
	'Fish-free',
	'Shellfish-free',
	'TreeNuts-Free',
	'Sesame-free',
	'Mustard-free',
	'Halal',
]

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
const prefAddError = ref<string | null>(null)

const allergenCatalog = ref<Allergen[]>([])

const user = ref<UserDto>({ id: 0, name: '', email: '', avatar_base64: null, dietary_prof: [], allergens: [] })

const isEditModalOpen = ref(false)
const avatarInputRef = ref<HTMLInputElement | null>(null)
const avatarError = ref('')
const customPrefDraft = ref('')

const halalPref = computed(() => user.value.dietary_prof?.[0]?.halal_pref ?? false)

// Reads custom_preferences array or falls back to mapped user.allergens
const displayPreferences = computed(() => {
	const custom = user.value.dietary_prof?.[0]?.custom_preferences ?? []
	if (custom.length > 0) return custom

	return (user.value.allergens ?? []).map((a) => `${formatAllergenName(a.name)}-free`)
})

const prefTotal = computed(() => form.customPreferences.length + (form.halalPref ? 1 : 0))

const form = reactive({
	name: '',
	email: '',
	halalPref: false,
	customPreferences: [] as string[],
	avatarBase64: null as string | null,
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
	customPrefDraft.value = ''
	prefLimitWarning.value = false
	prefAddError.value = null
	isEditModalOpen.value = true
}

function closeEditModal() {
	isEditModalOpen.value = false
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

function isNonConsumable(value: string): boolean {
	const lower = value.toLowerCase()
	return NON_CONSUMABLE_TERMS.some((term) => lower.includes(term))
}

function addCustomPreference() {
	const value = customPrefDraft.value.trim()
	if (!value) return

	if (isNonConsumable(value)) {
		prefAddError.value = 'Please enter a food-related dietary preference.'
		return
	}

	if (prefTotal.value >= PREF_MAX) {
		prefLimitWarning.value = true
		return
	}

	if (!form.customPreferences.includes(value)) {
		form.customPreferences.push(value)
		prefAddError.value = null
	}
	customPrefDraft.value = ''
}

function handleQuickAdd(suggestion: string) {
	if (prefTotal.value >= PREF_MAX) {
		prefLimitWarning.value = true
		return
	}
	if (suggestion === 'Halal') {
		form.halalPref = true
	} else {
		addQuickPreference(suggestion)
	}
}

function addQuickPreference(suggestion: string) {
	if (!form.customPreferences.includes(suggestion)) {
		form.customPreferences.push(suggestion)
	}
}

function removeCustomPreference(pref: string) {
	form.customPreferences = form.customPreferences.filter((p) => p !== pref)
	prefLimitWarning.value = false
}

function removeHalalPref() {
	form.halalPref = false
	prefLimitWarning.value = false
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
		closeEditModal()
		showSuccessToast.value = true
	} catch (err) {
		saveError.value = err instanceof ApiError ? err.message : 'Something went wrong while saving.'
	} finally {
		isSaving.value = false
	}
}

function handleLogout() {
	authStore.logout()
	router.replace('/')
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
	--background: #ffffff;
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

.header-section {
	background: #ffffff;
	padding: 36px 24px 24px;
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

.chip-remove {
	cursor: pointer;
	font-size: 0.9rem;
}

.main-body {
	background-color: #f8fafc;
	min-height: 100%;
	flex: 1;
	padding: 20px 20px 40px;
}

.action-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.action-row {
	display: flex;
	align-items: center;
	gap: 14px;
	background: #ffffff;
	border: none;
	border-radius: 16px;
	padding: 18px 20px;
	font-size: 0.95rem;
	font-weight: 600;
	color: #0f172a;
	width: 100%;
	text-align: left;
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
	margin-left: auto;
	color: #94a3b8;
	font-size: 1rem;
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
	--height: auto;
	--width: 90%;
	--max-width: 400px;
	--border-radius: 20px;
	--background: transparent;
	--box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.custom-edit-modal .modal-card {
	background: #ffffff;
	border-radius: 20px;
	padding: 24px 20px;
	width: 100%;
	box-sizing: border-box;
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

.custom-edit-modal .chip-row--editable {
	margin-top: 6px;
	margin-bottom: 12px;
}

.custom-edit-modal .custom-pref-input-row {
	display: flex;
	gap: 8px;
	margin-bottom: 14px;
}

.custom-edit-modal .pref-text-input {
	flex: 1;
}

.custom-edit-modal .pref-text-input:focus {
	border: 1.5px solid #00b050;
	outline: none;
}

.custom-edit-modal .add-btn {
	background: #a7f3d0;
	color: #ffffff;
	border: none;
	border-radius: 12px;
	padding: 0 18px;
	font-weight: 600;
	font-size: 0.9rem;
	cursor: not-allowed;
	transition: background-color 0.2s ease;
}

.custom-edit-modal .add-btn:not(:disabled) {
	background: #00b050;
	cursor: pointer;
}

.custom-edit-modal .quick-add-label {
	font-size: 0.8rem;
	color: #64748b;
	margin: 8px 0;
}

.custom-edit-modal .quick-add-chip {
	border: none;
	background: #f1f5f9;
	color: #475569;
	border-radius: 12px;
	padding: 6px 12px;
	font-size: 0.8rem;
	font-weight: 500;
	cursor: pointer;
}

.custom-edit-modal .quick-add-chip:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.custom-edit-modal .quick-add-chip--active {
	background: #dcfce7;
	color: #059669;
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

.custom-edit-modal .pref-add-error {
	color: #b91c1c;
	font-size: 0.78rem;
	margin: -10px 0 8px;
}
</style>