<template>
	<ion-modal :is-open="isOpen" @didDismiss="handleDismiss">
		<ion-content class="light-content ion-padding">
			<!-- Header Block -->
			<div class="modal-custom-header">
				<button type="button" class="back-circle-btn" aria-label="Go back" @click="handleBack">
					<ion-icon :icon="arrowBackOutline" />
				</button>
				<div class="header-text-block">
					<h2 class="header-title">{{ step === 1 ? 'Upload a Photo' : 'Product Details' }}</h2>
					<p class="step-caption">Step {{ step }} of 2 — {{ step === 1 ? 'Select your photo' : 'Fill in the details' }}</p>
				</div>
			</div>

			<div class="progress-row">
				<div class="progress-segment" :class="{ filled: step >= 1 }"></div>
				<div class="progress-segment" :class="{ filled: step >= 2 }"></div>
			</div>

			<!-- ============ STEP 1: PHOTO ============ -->
			<div v-if="step === 1">
				<ion-accordion-group :value="'guidelines'">
					<ion-accordion value="guidelines" class="light-accordion">
						<ion-item slot="header" lines="none" class="guidelines-header-item">
							<ion-icon :icon="informationCircleOutline" slot="start" class="guidelines-info-icon" />
							<ion-label class="guidelines-header-label">Photo Upload Guidelines</ion-label>
						</ion-item>
						<div slot="content" class="guidelines-content">
							<div class="guidelines-list">
								<div class="guideline-item">
									<span class="badge-number">1</span>
									<span>Upload only clear and focused images of the stocks (eg. fruits, vegetables, dry goods).</span>
								</div>
								<div class="guideline-item">
									<span class="badge-number">2</span>
									<span>Do not upload unrelated or non-food images.</span>
								</div>
								<div class="guideline-item">
									<span class="badge-number">3</span>
									<span>Avoid blurry, dark, or obstructed photos.</span>
								</div>
							</div>
						</div>
					</ion-accordion>
				</ion-accordion-group>

				<!-- Dynamic Upload Limit Note -->
				<p class="upload-limit-note" :class="{ 'upload-limit-note--reached': remainingUploads <= 0 }">
					<ion-icon :icon="warningOutline" />
					<span v-if="remainingUploads > 0">Daily upload limit: {{ remainingUploads }} of {{ DAILY_MAX_LIMIT }} photos remaining</span>
					<span v-else>Daily upload limit reached (7/7). Try again tomorrow.</span>
				</p>

				<input
					ref="fileInputRef"
					type="file"
					accept="image/*"
					class="hidden-input"
					:disabled="remainingUploads <= 0"
					@change="onFileSelected" />

				<div
					class="upload-dropzone"
					:class="{ 'upload-dropzone--disabled': remainingUploads <= 0 }"
					@click="remainingUploads > 0 && fileInputRef?.click()">
					<template v-if="!previewUrl">
						<div class="upload-icon-wrapper">
							<ion-icon :icon="cloudUploadOutline" class="upload-icon" />
						</div>
						<p class="upload-title">{{ remainingUploads > 0 ? 'Tap to upload a photo' : 'Limit Reached' }}</p>
						<p class="upload-subtitle">
							{{ remainingUploads > 0 ? 'Take a photo or choose from your gallery' : 'You have reached your 7 photo limit for today' }}
						</p>
					</template>
					<template v-else>
						<img :src="previewUrl" alt="Selected product photo" class="preview-image" />
						<p class="change-photo-link">Tap to change photo</p>
					</template>
				</div>

				<div v-if="fileError" class="form-error">{{ fileError }}</div>

				<div v-if="nonFoodDetected" class="nonfood-alert">
					Non-food product detected. Only edible food items can be added to your pantry.
				</div>

				<ion-button expand="block" class="primary-button" :disabled="!previewUrl || remainingUploads <= 0 || isAnalyzing || nonFoodDetected" @click="goToStep2">
					<ion-spinner v-if="isAnalyzing" name="crescent" slot="start" />
					{{ isAnalyzing ? 'Analyzing…' : 'Continue' }}
				</ion-button>
				<p v-if="!previewUrl && remainingUploads > 0" class="required-note">A photo is required to continue</p>
			</div>

			<!-- ============ STEP 2: DETAILS ============ -->
			<div v-else>
				<div class="photo-summary">
					<img :src="previewUrl!" alt="Uploaded photo" class="thumbnail" />
					<div>
						<p class="uploaded-label">Uploaded photo</p>
						<a href="#" class="change-photo-text" @click.prevent="step = 1">Change photo</a>
					</div>
				</div>

				<div v-if="formError" class="form-error">{{ formError }}</div>

				<div v-if="matchedUserAllergens.length > 0" class="personal-allergen-alert">
					<ion-icon :icon="warningOutline" />
					<div>
						<p class="personal-allergen-alert__title">Contains your allergen{{ matchedUserAllergens.length > 1 ? 's' : '' }}</p>
						<p class="personal-allergen-alert__list">{{ matchedUserAllergens.join(', ') }}</p>
					</div>
				</div>

				<div v-if="form.ingredientsText" class="ingredients-display">
					<label class="field-label-brown">Detected Ingredients</label>
					<p class="ingredients-text-readonly">{{ form.ingredientsText }}</p>
				</div>

				<form @submit.prevent="handleSubmit">
					<div class="form-group">
						<label class="field-label-brown">Product Name *</label>
						<input v-model="form.productName" type="text" placeholder="e.g. Magnolia Full Cream Milk" required class="native-text-input" />
					</div>

					<div class="date-selection-box">
						<div class="info-box">
							<ion-icon :icon="informationCircleOutline" />
							<span>You must provide at least one date before adding to pantry.</span>
						</div>

						<div class="date-field">
							<label class="date-field-label">Expiration Date</label>
							<span class="field-hint">For packaged and processed products (e.g. canned goods, dairy, meat).</span>
							<input
								v-model="form.expirationDate"
								type="date"
								class="date-input"
								:class="{ 'date-input--has-value': !!form.expirationDate }"
							/>
						</div>

						<div class="or-divider"><span>OR</span></div>

						<div class="date-field">
							<label class="date-field-label">Best Before Date</label>
							<span class="field-hint">For fresh stocks and produce (e.g. fruits, vegetables, dry goods).</span>
							<input
								v-model="form.bestBeforeDate"
								type="date"
								class="date-input"
								:class="{ 'date-input--has-value': !!form.bestBeforeDate }"
							/>
						</div>
					</div>

					<label class="field-label-brown">Storage Location</label>
					<div class="storage-buttons">
						<button
							v-for="loc in storageLocations"
							:key="loc"
							type="button"
							class="pill"
							:class="{ 'pill--active': form.storageLocation === loc }"
							@click="form.storageLocation = loc">
							{{ loc }}
						</button>
					</div>

					<!-- Styled Quantity & Unit -->
					<label class="field-label-brown">Quantity &amp; Unit</label>
					<div class="quantity-row">
						<input type="number" min="0.01" step="any" class="quantity-input" v-model.number="form.quantity" />
						<select class="unit-select" v-model="form.unit">
							<option v-for="opt in unitOptions" :key="opt" :value="opt">{{ opt }}</option>
						</select>
					</div>

					<ion-button expand="block" type="submit" class="primary-button" :disabled="!isFormValid || isSubmitting">
						<ion-spinner v-if="isSubmitting" name="crescent" slot="start" />
						<ion-icon v-else :icon="addOutline" slot="start" />
						{{ isSubmitting ? 'Adding...' : 'Add to Pantry' }}
					</ion-button>
				</form>
			</div>
		</ion-content>
	</ion-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import {
	IonModal,
	IonIcon,
	IonButton,
	IonContent,
	IonAccordionGroup,
	IonAccordion,
	IonItem,
	IonLabel,
	IonSpinner,
	alertController,
} from '@ionic/vue'
import {
	arrowBackOutline,
	informationCircleOutline,
	warningOutline,
	cloudUploadOutline,
	addOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError, API_BASE_URL } from '@/utils/api'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const DAILY_MAX_LIMIT = 7
const TOKEN_KEY = 'omniscan_token'

interface AnalyzeResult {
	is_food_product: boolean
	product_name: string
	expiration_date: string | null
	ingredients_text: string
	simplified_ingredients: string
	net_quantity: number | null
	net_unit: string | null
	matched_user_allergens: string[]
}

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()

const step = ref<1 | 2>(1)
const fileInputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const fileError = ref<string | null>(null)
const remainingUploads = ref<number>(DAILY_MAX_LIMIT)
const selectedFile = ref<File | null>(null)
const isAnalyzing = ref(false)
const nonFoodDetected = ref(false)

const storageLocations = ['Fridge', 'Freezer', 'Cupboard'] as const
const unitOptions = ['pcs', 'g', 'kg', 'ml', 'L']

const form = reactive({
	productName: '',
	expirationDate: '',
	bestBeforeDate: '',
	storageLocation: 'Cupboard' as (typeof storageLocations)[number],
	quantity: 1,
	unit: 'pcs',
	ingredientsText: '',
	simplifiedIngredientsText: '',
})

const isSubmitting = ref(false)
const formError = ref<string | null>(null)
const matchedUserAllergens = ref<string[]>([])

// Check remaining daily upload limit whenever the modal opens
watch(
	() => props.isOpen,
	async (isOpen) => {
		if (isOpen) {
			await checkDailyUploadLimit()
		}
	}
)

async function checkDailyUploadLimit(): Promise<void> {
	try {
		const data = await apiFetch<{ remaining: number }>('/api/upload_limit', { method: 'GET' })
		remainingUploads.value = data.remaining
	} catch (err) {
		console.error('Failed to fetch daily upload limit:', err)
	}
}

const isFormValid = computed(() => {
	const hasName = form.productName.trim().length > 0
	const hasValidQty = form.quantity > 0
	const hasAtLeastOneDate = !!form.expirationDate || !!form.bestBeforeDate
	return hasName && hasValidQty && hasAtLeastOneDate
})

function resetAll(): void {
	step.value = 1
	previewUrl.value = null
	fileError.value = null
	formError.value = null
	isAnalyzing.value = false
	nonFoodDetected.value = false
	selectedFile.value = null
	matchedUserAllergens.value = []
	form.productName = ''
	form.expirationDate = ''
	form.bestBeforeDate = ''
	form.storageLocation = 'Cupboard'
	form.quantity = 1
	form.unit = 'pcs'
	form.ingredientsText = ''
	form.simplifiedIngredientsText = ''
}

function onFileSelected(event: Event): void {
	nonFoodDetected.value = false

	if (remainingUploads.value <= 0) {
		fileError.value = 'Daily upload limit reached.'
		return
	}

	fileError.value = null
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''

	if (!file) return

	if (!file.type.startsWith('image/')) {
		fileError.value = 'Please select an image file.'
		return
	}

	if (file.size > MAX_FILE_SIZE_BYTES) {
		fileError.value = 'Image is too large. Please choose a photo under 5MB.'
		return
	}

	selectedFile.value = file

	const reader = new FileReader()
	reader.onload = () => {
		previewUrl.value = reader.result as string
	}
	reader.onerror = () => {
		fileError.value = 'Failed to read the selected file. Please try again.'
	}
	reader.readAsDataURL(file)
}

async function goToStep2(): Promise<void> {
	if (!previewUrl.value || remainingUploads.value <= 0) return
	nonFoodDetected.value = false
	isAnalyzing.value = true
	try {
		const token = localStorage.getItem(TOKEN_KEY)
		const fd = new FormData()
		fd.append('image', selectedFile.value!)
		const response = await fetch(`${API_BASE_URL}/api/pantry_item/analyze`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
			body: fd,
		})
		if (!response.ok) {
			step.value = 2
			return
		}
		const result: AnalyzeResult = await response.json()
		if (!result.is_food_product) {
			nonFoodDetected.value = true
			return
		}
		if (result.product_name) form.productName = result.product_name
		if (result.expiration_date) form.expirationDate = result.expiration_date
		form.ingredientsText = result.ingredients_text || ''
		form.simplifiedIngredientsText = result.simplified_ingredients || ''
		matchedUserAllergens.value = result.matched_user_allergens ?? []
		// Pre-fill quantity and unit if the AI detected them
		const UNIT_OPTIONS = ['pcs', 'g', 'kg', 'ml', 'L']
		const unitMap: Record<string, string> = { pc: 'pcs', piece: 'pcs', pieces: 'pcs', pcs: 'pcs', liter: 'L', litre: 'L', liters: 'L', litres: 'L', gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg', milliliter: 'ml', millilitre: 'ml', milliliters: 'ml', millilitres: 'ml' }
		if (typeof result.net_quantity === 'number' && result.net_quantity > 0) {
			form.quantity = result.net_quantity
		}
		if (typeof result.net_unit === 'string' && result.net_unit.trim()) {
			const normalized = unitMap[result.net_unit.trim().toLowerCase()] ?? result.net_unit.trim().toLowerCase()
			if (UNIT_OPTIONS.includes(normalized)) form.unit = normalized
		}
		step.value = 2
	} catch {
		step.value = 2
	} finally {
		isAnalyzing.value = false
	}
}

function handleBack(): void {
	if (step.value === 2) {
		step.value = 1
	} else {
		handleDismiss()
	}
}

function handleDismiss(): void {
	emit('close')
	resetAll()
}

async function handleSubmit(): Promise<void> {
	if (!isFormValid.value || remainingUploads.value <= 0) return
	formError.value = null

	// Allergen guardrail
	if (matchedUserAllergens.value.length > 0) {
		const alert = await alertController.create({
			header: 'Allergen Warning',
			message: `This item contains allergens matching your dietary profile (${matchedUserAllergens.value.join(', ')}). Are you sure you want to add it to your pantry?`,
			buttons: [
				{ text: 'Cancel', role: 'cancel' },
				{ text: 'Add Anyway', role: 'confirm' },
			],
		})
		await alert.present()
		const { role } = await alert.onDidDismiss()
		if (role !== 'confirm') return
	}

	// Guard: block adding already-expired items
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	if (form.expirationDate) {
		const exp = new Date(form.expirationDate + 'T00:00:00')
		if (exp < today) {
			formError.value = 'This product has already expired and cannot be added to your pantry. Please update the expiration date or remove it.'
			return
		}
	}
	if (form.bestBeforeDate) {
		const bbd = new Date(form.bestBeforeDate + 'T00:00:00')
		if (bbd < today) {
			formError.value = 'This product\'s best-before date has already passed. Please update the date or remove it.'
			return
		}
	}

	isSubmitting.value = true

	try {
		await apiFetch('/api/pantry_item', {
			method: 'POST',
			body: {
				product_name: form.productName.trim(),
				image_base64: previewUrl.value,
				ingredient_text: form.ingredientsText || undefined,
				simplified_ingredients: form.simplifiedIngredientsText || undefined,
				expiration_date: form.expirationDate || undefined,
				best_before_date: form.bestBeforeDate || undefined,
				storage_location: form.storageLocation,
				quantity: form.quantity,
				unit: form.unit,
			},
		})

		emit('created')
		handleDismiss()
	} catch (err) {
		formError.value = err instanceof ApiError ? err.message : 'Failed to add item to pantry.'
		console.error('Add to pantry error:', err)
	} finally {
		isSubmitting.value = false
	}
}
</script>

<style scoped>
.light-content {
	--background: #ffffff;
	--color: #4b5563;
}

.modal-custom-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-top: 6px;
	margin-bottom: 12px;
}

.back-circle-btn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: #f1f5f9;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #1f2937;
	font-size: 1.1rem;
	cursor: pointer;
	flex-shrink: 0;
}

.header-text-block {
	display: flex;
	flex-direction: column;
}

.header-title {
	margin: 0;
	font-size: 1.05rem;
	font-weight: 700;
	color: #1f2937;
	line-height: 1.25;
}

.step-caption {
	color: #9aa0a6;
	font-size: 0.78rem;
	margin: 2px 0 0;
}

.progress-row {
	display: flex;
	gap: 8px;
	margin-bottom: 16px;
}

.progress-segment {
	flex: 1;
	height: 4px;
	border-radius: 2px;
	background: #e2e8f0;
}

.progress-segment.filled {
	background: #00b14f;
}

ion-accordion-group {
	border: 1px solid #e2e8f0;
	border-radius: 14px;
	overflow: hidden;
	margin-bottom: 12px;
	background: #f8fafc;
}

.light-accordion {
	background: #f8fafc;
}

.guidelines-header-item {
	--background: #f8fafc;
	--padding-start: 12px;
}

.guidelines-info-icon {
	color: #00b14f;
	font-size: 1.15rem;
	margin-right: 8px;
}

.guidelines-header-label {
	font-size: 0.85rem;
	font-weight: 600;
	color: #1f2937;
}

.guidelines-content {
	padding: 12px 14px 16px;
	background: #f8fafc;
}

.guidelines-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.guideline-item {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	font-size: 0.8rem;
	color: #334155;
	line-height: 1.38;
}

.badge-number {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: #00b14f;
	color: #ffffff;
	font-weight: 700;
	font-size: 0.72rem;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-top: 1px;
}

.upload-limit-note {
	color: #d9762b;
	font-size: 0.78rem;
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 12px 0;
	font-weight: 600;
}

.upload-limit-note--reached {
	color: #ef4444;
}

.hidden-input {
	display: none;
}

.upload-dropzone {
	border: 1px dashed #cbd5e1;
	border-radius: 16px;
	padding: 32px 16px;
	text-align: center;
	cursor: pointer;
	margin: 16px 0;
	background: #ffffff;
	transition: opacity 0.2s ease;
}

.upload-dropzone--disabled {
	opacity: 0.5;
	cursor: not-allowed;
	background: #f8fafc;
}

.upload-icon-wrapper {
	width: 50px;
	height: 50px;
	border-radius: 50%;
	background: #f1f5f9;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 8px;
}

.upload-icon {
	font-size: 1.5rem;
	color: #94a3b8;
}

.upload-title {
	font-weight: 700;
	margin: 6px 0 3px;
	color: #1f2937;
	font-size: 0.925rem;
}

.upload-subtitle {
	color: #9aa0a6;
	font-size: 0.8rem;
}

.preview-image {
	max-width: 100%;
	max-height: 200px;
	border-radius: 12px;
}

.change-photo-link {
	color: #00b14f;
	font-size: 0.825rem;
	margin-top: 8px;
}

.required-note {
	text-align: center;
	color: #9aa0a6;
	font-size: 0.78rem;
	margin-top: 8px;
}

.photo-summary {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 14px;
}

.thumbnail {
	width: 52px;
	height: 52px;
	object-fit: cover;
	border-radius: 10px;
}

.uploaded-label {
	font-size: 0.825rem;
	color: #374151;
	margin: 0;
}

.change-photo-text {
	color: #00b14f;
	font-size: 0.825rem;
	text-decoration: underline;
}

.form-group {
	margin-bottom: 12px;
}

.field-label-brown {
	display: block;
	font-size: 0.8rem;
	font-weight: 600;
	color: #92400e;
	margin: 10px 0 5px;
}

.native-text-input {
	width: 100%;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.9rem;
	color: #1f2937;
	background: #ffffff;
	box-sizing: border-box;
}

.native-text-input::placeholder {
	color: #9aa0a6;
}

.date-selection-box {
	background: #eff6ff;
	border: 1px solid #dbeafe;
	border-radius: 16px;
	padding: 14px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin: 14px 0;
}

.info-box {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	color: #2563eb;
	font-size: 0.78rem;
	line-height: 1.35;
	background: transparent;
	padding: 0;
}

.info-box ion-icon {
	margin-top: 1px;
	flex-shrink: 0;
}

.date-field {
	display: flex;
	flex-direction: column;
}

.date-field-label {
	display: block;
	font-size: 0.8rem;
	font-weight: 600;
	color: #92400e;
}

.field-hint {
	display: block;
	font-weight: 400;
	color: #94a3b8;
	font-size: 0.74rem;
	line-height: 1.35;
	margin-top: 2px;
	margin-bottom: 6px;
}

.date-input {
	width: 100%;
	border: 1px solid #cbd5e1;
	border-radius: 12px;
	padding: 10px 14px;
	font-size: 0.875rem;
	color: #374151;
	background: #ffffff;
	box-sizing: border-box;
	transition: all 0.2s ease;
}

.date-input--has-value,
.date-input:focus {
	border-color: #22c55e;
	box-shadow: 0 0 0 1px #22c55e;
	outline: none;
}

.or-divider {
	display: flex;
	align-items: center;
	text-align: center;
	color: #9aa0a6;
	font-size: 0.76rem;
	font-weight: 500;
	margin: 1px 0;
}

.or-divider::before,
.or-divider::after {
	content: '';
	flex: 1;
	border-top: 1px solid #bfdbfe;
}

.or-divider span {
	padding: 0 10px;
	color: #3b82f6;
}

.storage-buttons {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}

.pill {
	border: 1px solid #e5e7eb;
	background: #ffffff;
	color: #374151;
	border-radius: 12px;
	padding: 9px 0;
	font-size: 0.825rem;
	font-weight: 500;
	flex: 1;
}

.pill--active {
	border-color: #00b14f;
	color: #ffffff;
	background: #00b14f;
	font-weight: 600;
}

.quantity-row {
	display: flex;
	gap: 10px;
	margin-bottom: 14px;
}

.quantity-input {
	flex: 1;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.925rem;
	color: #3b5bfd;
	font-weight: 500;
	background: #ffffff;
	appearance: textfield;
	-moz-appearance: textfield;
}

.quantity-input::-webkit-outer-spin-button,
.quantity-input::-webkit-inner-spin-button {
	appearance: none;
	-webkit-appearance: none;
	margin: 0;
}

.unit-select {
	flex: 1;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.925rem;
	color: #3b5bfd;
	font-weight: 500;
	background: #ffffff;
}

.primary-button {
	--background: #00b14f;
	--background-activated: #009643;
	--background-disabled: #e2e8f0;
	--color-disabled: #94a3b8;
	--color: #ffffff;
	--border-radius: 12px;
	font-weight: 700;
	margin-top: 20px;
	height: 48px;
}

.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border: 1px solid #fca5a5;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 0.825rem;
}

.nonfood-alert {
	background: #fef2f2;
	color: #b91c1c;
	border: 1px solid #fca5a5;
	border-radius: 10px;
	padding: 10px 14px;
	font-size: 0.825rem;
	font-weight: 500;
	margin: 10px 0;
}

.personal-allergen-alert {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	background: #fee2e2;
	border: 1px solid #fca5a5;
	color: #b91c1c;
	border-radius: 12px;
	padding: 12px 14px;
	margin-bottom: 14px;
	font-size: 0.85rem;
}
.personal-allergen-alert ion-icon {
	font-size: 1.2rem;
	margin-top: 1px;
	flex-shrink: 0;
}
.personal-allergen-alert__title {
	margin: 0;
	font-weight: 700;
}
.personal-allergen-alert__list {
	margin: 2px 0 0;
	font-weight: 500;
}

.ingredients-display {
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 12px 14px;
	margin: 12px 0;
}

.ingredients-text-readonly {
	font-size: 0.825rem;
	color: #374151;
	line-height: 1.5;
	margin: 4px 0 0;
	white-space: pre-wrap;
}
</style>