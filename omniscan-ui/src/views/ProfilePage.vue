<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-title>Profile</ion-title>
			</ion-toolbar>
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
				<!-- Header card -->
				<div class="header-card">
					<div class="avatar-wrap">
						<img v-if="user.avatar_base64" :src="user.avatar_base64" alt="Profile photo" class="avatar-image" />
						<span v-else class="avatar-initial">{{ user.name.charAt(0) }}</span>
					</div>
					<div class="header-info">
						<h1 class="user-name">{{ user.name }}</h1>
						<p class="user-email">{{ user.email }}</p>
					</div>
					<ion-button fill="clear" class="edit-trigger" @click="openEditModal">
						<ion-icon :icon="pencilOutline" slot="icon-only" />
					</ion-button>
				</div>

				<!-- Lifestyle preference summary (matches mockup's top chip row) -->
				<div v-if="halalPref || customPreferences.length > 0" class="pref-summary">
					<p class="section-label">Dietary Preferences:</p>
					<div class="chip-row">
						<span v-if="halalPref" class="pref-chip">Halal</span>
						<span v-for="pref in customPreferences" :key="pref" class="pref-chip">{{ pref }}</span>
					</div>
				</div>

				<!-- Action rows -->
				<div class="action-list">
					<button type="button" class="action-row" @click="router.push('/tabs/settings')">
						<ion-icon :icon="settingsOutline" />
						<span>Settings</span>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
					<button type="button" class="action-row" @click="router.push('/tabs/notifications')">
						<ion-icon :icon="notificationsOutline" />
						<span>Notifications</span>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
					<button type="button" class="action-row action-row--danger" @click="handleLogout">
						<ion-icon :icon="logOutOutline" />
						<span>Log Out</span>
						<ion-icon :icon="chevronForwardOutline" class="chevron" />
					</button>
				</div>

				<!-- Stats -->
				<p class="section-label section-label--top">Your Stats</p>
				<div class="stats-card">
					<span class="stats-label">Total Items Scanned</span>
					<span class="stats-value">{{ stats.total_items_scanned }}</span>
				</div>
			</template>

			<ion-toast
				:is-open="showSuccessToast"
				message="Profile updated successfully."
				:duration="2000"
				color="success"
				@didDismiss="showSuccessToast = false" />

			<!-- Edit Profile Modal -->
			<ion-modal :is-open="isEditModalOpen" @didDismiss="closeEditModal">
				<ion-header>
					<ion-toolbar>
						<ion-title>Edit Profile</ion-title>
						<ion-buttons slot="end">
							<ion-button @click="closeEditModal">
								<ion-icon :icon="closeOutline" slot="icon-only" />
							</ion-button>
						</ion-buttons>
					</ion-toolbar>
				</ion-header>

				<ion-content class="ion-padding">
					<div v-if="saveError" class="form-error">{{ saveError }}</div>

					<div class="avatar-edit-wrap">
						<img v-if="form.avatarBase64" :src="form.avatarBase64" alt="Profile photo" class="avatar-image-large" />
						<span v-else class="avatar-initial avatar-initial--large">{{ form.name.charAt(0) || '?' }}</span>
						<button type="button" class="avatar-upload-btn" @click="avatarInputRef?.click()">
							<ion-icon :icon="cameraOutline" />
						</button>
						<input ref="avatarInputRef" type="file" accept="image/*" class="hidden-input" @change="onAvatarSelected" />
					</div>
					<p v-if="avatarError" class="form-error">{{ avatarError }}</p>

					<ion-item lines="none" class="form-field">
						<ion-label position="stacked">Name</ion-label>
						<ion-input v-model="form.name" placeholder="Your name" />
					</ion-item>

					<ion-item lines="none" class="form-field">
						<ion-label position="stacked">Email</ion-label>
						<ion-input :value="form.email" :disabled="true" />
					</ion-item>

					<p class="section-label">Dietary Preferences</p>
					<div class="chip-row chip-row--editable">
						<span v-if="form.halalPref" class="pref-chip">
							Halal
							<ion-icon :icon="closeOutline" class="chip-remove" @click="form.halalPref = false" />
						</span>
						<span v-for="pref in form.customPreferences" :key="pref" class="pref-chip">
							{{ pref }}
							<ion-icon :icon="closeOutline" class="chip-remove" @click="removeCustomPreference(pref)" />
						</span>
					</div>

					<div class="custom-pref-input-row">
						<ion-input
							v-model="customPrefDraft"
							placeholder="Type a custom preference…"
							class="custom-pref-input"
							@keyup.enter="addCustomPreference" />
						<ion-button size="small" @click="addCustomPreference">
							<ion-icon :icon="addOutline" slot="start" />
							Add
						</ion-button>
					</div>

					<p class="quick-add-label">Quick add:</p>
					<div class="chip-row">
						<button
							v-for="suggestion in quickAddSuggestions"
							:key="suggestion"
							type="button"
							class="quick-add-chip"
							:disabled="form.customPreferences.includes(suggestion)"
							@click="addQuickPreference(suggestion)">
							+ {{ suggestion }}
						</button>
						<button
							type="button"
							class="quick-add-chip"
							:class="{ 'quick-add-chip--active': form.halalPref }"
							@click="form.halalPref = true">
							+ Halal
						</button>
					</div>

					<ion-button expand="block" class="save-button" :disabled="isSaving" @click="saveProfile">
						<ion-spinner v-if="isSaving" name="crescent" slot="start" />
						{{ isSaving ? 'Saving…' : 'Save Changes' }}
					</ion-button>
				</ion-content>
			</ion-modal>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
	IonPage,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonContent,
	IonButton,
	IonButtons,
	IonIcon,
	IonSpinner,
	IonToast,
	IonModal,
	IonItem,
	IonLabel,
	IonInput,
} from '@ionic/vue'
import {
	alertCircleOutline,
	pencilOutline,
	settingsOutline,
	notificationsOutline,
	logOutOutline,
	chevronForwardOutline,
	closeOutline,
	cameraOutline,
	addOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB raw, before base64 overhead

const quickAddSuggestions = [
	'Keto',
	'Paleo',
	'Low-sodium',
	'Low-carb',
	'Pescatarian',
	'Gluten-free',
	'Dairy-free',
	'Egg-free',
	'Soy-free',
	'Peanut-free',
	'Tree Nut-free',
	'Shellfish-free',
	'Sesame-free',
	'Fish-free',
	'Mustard-free',
]

// Maps a dietary tag to the real allergen name it should enforce at the safety-check
// level. These tags are the only UI surface now — selecting one silently keeps the
// underlying Allergen relation (used by scans/recipe suggestions) in sync. Anything
// not listed here (Keto, Paleo, Pescatarian, etc.) is cosmetic and has no allergen mapping.
const ALLERGEN_TAG_MAP: Record<string, string> = {
	'Gluten-free': 'Wheat',
	'Dairy-free': 'Milk',
	'Egg-free': 'Eggs',
	'Soy-free': 'Soy',
	'Peanut-free': 'Peanuts',
	'Tree Nut-free': 'Tree Nuts',
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
	stats: { total_items_scanned: number }
}

const isLoading = ref(true)
const loadError = ref('')
const isSaving = ref(false)
const saveError = ref('')
const showSuccessToast = ref(false)

const allergenCatalog = ref<Allergen[]>([])

const user = ref<UserDto>({ id: 0, name: '', email: '', avatar_base64: null, dietary_prof: [], allergens: [] })
const stats = ref({ total_items_scanned: 0 })

const isEditModalOpen = ref(false)
const avatarInputRef = ref<HTMLInputElement | null>(null)
const avatarError = ref('')
const customPrefDraft = ref('')

const halalPref = computed(() => user.value.dietary_prof?.[0]?.halal_pref ?? false)
const customPreferences = computed(() => user.value.dietary_prof?.[0]?.custom_preferences ?? [])

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
		stats.value = data.stats
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Something went wrong while loading your profile.'
	} finally {
		isLoading.value = false
	}
}

// Background lookup only — powers deriveAllergenIds() so the dietary tags above can
// silently keep the safety-check Allergen relation in sync. Not shown in the UI, so
// failures are logged rather than surfaced; worst case, allergen sync is skipped for
// this save and scans/recipes fall back to whatever was already set.
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
	form.customPreferences = [...customPreferences.value]
	form.avatarBase64 = user.value.avatar_base64
	avatarError.value = ''
	saveError.value = ''
	customPrefDraft.value = ''
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

function addCustomPreference() {
	const value = customPrefDraft.value.trim()
	if (!value) return
	if (!form.customPreferences.includes(value)) {
		form.customPreferences.push(value)
	}
	customPrefDraft.value = ''
}

function addQuickPreference(suggestion: string) {
	if (!form.customPreferences.includes(suggestion)) {
		form.customPreferences.push(suggestion)
	}
}

function removeCustomPreference(pref: string) {
	form.customPreferences = form.customPreferences.filter((p) => p !== pref)
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
	router.push('/login')
}

onMounted(() => {
	fetchProfile()
	fetchAllergens()
})
</script>

<style scoped>
.profile-content {
	--background: #f7f8fa;
}
.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 48px 16px;
	text-align: center;
}

.header-card {
	display: flex;
	align-items: center;
	gap: 12px;
	background: #ffffff;
	border-radius: 16px;
	padding: 16px;
	margin: 12px 16px 0;
}
.avatar-wrap {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
}
.avatar-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.avatar-initial {
	font-size: 1.5rem;
	font-weight: 700;
	color: #9ca3af;
}
.header-info {
	flex: 1;
	min-width: 0;
}
.user-name {
	font-size: 1.2rem;
	font-weight: 700;
	margin: 0;
}
.user-email {
	font-size: 0.85rem;
	color: #6b7280;
	margin: 2px 0 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.edit-trigger {
	color: #16a34a;
}

.pref-summary {
	margin: 16px 16px 0;
}
.section-label {
	font-weight: 600;
	font-size: 0.85rem;
	color: #374151;
	margin: 0 0 8px;
}
.section-label--top {
	margin-top: 20px;
}
.chip-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
.pref-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	background: #dcfce7;
	color: #15803d;
	border-radius: 999px;
	padding: 4px 12px;
	font-size: 0.85rem;
	font-weight: 500;
}
.chip-remove {
	cursor: pointer;
	font-size: 0.9rem;
}

.action-list {
	margin: 20px 16px 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.action-row {
	display: flex;
	align-items: center;
	gap: 12px;
	background: #ffffff;
	border: none;
	border-radius: 14px;
	padding: 14px 16px;
	font-size: 0.95rem;
	color: #111827;
	text-align: left;
}
.action-row--danger {
	color: #dc2626;
}
.action-row .chevron {
	margin-left: auto;
	color: #9ca3af;
}

.stats-card {
	margin: 8px 16px 0;
	background: #ffffff;
	border-radius: 14px;
	padding: 16px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.stats-label {
	color: #16a34a;
	font-weight: 500;
}
.stats-value {
	font-weight: 700;
	font-size: 1.1rem;
}

/* Edit modal */
.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 0.85rem;
}
.avatar-edit-wrap {
	position: relative;
	width: 88px;
	height: 88px;
	margin: 0 auto 16px;
}
.avatar-image-large {
	width: 88px;
	height: 88px;
	border-radius: 50%;
	object-fit: cover;
}
.avatar-initial--large {
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
.avatar-upload-btn {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: #16a34a;
	color: #ffffff;
	border: 2px solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
}
.hidden-input {
	display: none;
}
.form-field {
	--padding-start: 0;
	margin-bottom: 8px;
}
.chip-row--editable {
	margin-bottom: 12px;
}
.custom-pref-input-row {
	display: flex;
	gap: 8px;
	align-items: center;
	margin-bottom: 12px;
}
.custom-pref-input {
	flex: 1;
	border: 1px solid #d1d5db;
	border-radius: 8px;
	--padding-start: 12px;
}
.quick-add-label {
	font-size: 0.8rem;
	color: #6b7280;
	margin: 4px 0 8px;
}
.quick-add-chip {
	border: 1px solid #d1d5db;
	background: #f9fafb;
	color: #374151;
	border-radius: 999px;
	padding: 4px 12px;
	font-size: 0.8rem;
}
.quick-add-chip:disabled {
	opacity: 0.5;
}
.quick-add-chip--active {
	border-color: #16a34a;
	color: #16a34a;
	background: #f0fdf4;
}
.save-button {
	--background: #16a34a;
	--border-radius: 12px;
	font-weight: 600;
	margin-top: 20px;
}
</style>
