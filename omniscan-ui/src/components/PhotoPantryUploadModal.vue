<template>
	<ion-modal :is-open="isOpen" @didDismiss="handleDismiss">
		<ion-header>
			<ion-toolbar>
				<ion-buttons slot="start">
					<ion-button @click="handleBack">
						<ion-icon :icon="arrowBackOutline" slot="icon-only" />
					</ion-button>
				</ion-buttons>
				<ion-title>{{ step === 1 ? 'Upload a Photo' : 'Product Details' }}</ion-title>
			</ion-toolbar>
		</ion-header>

		<ion-content class="ion-padding">
			<p class="step-caption">Step {{ step }} of 2 — {{ step === 1 ? 'Select your photo' : 'Fill in the details' }}</p>

			<div class="progress-row">
				<div class="progress-segment" :class="{ filled: step >= 1 }"></div>
				<div class="progress-segment" :class="{ filled: step >= 2 }"></div>
			</div>

			<!-- ============ STEP 1: PHOTO ============ -->
			<div v-if="step === 1">
				<ion-accordion-group>
					<ion-accordion value="guidelines">
						<ion-item slot="header">
							<ion-icon :icon="informationCircleOutline" slot="start" />
							<ion-label>Photo Upload Guidelines</ion-label>
						</ion-item>
						<div slot="content" class="guidelines-content">
							<ol>
								<li>Upload only clear and focused images of the product packaging.</li>
								<li>Ensure the label, ingredients, and expiration date are fully visible.</li>
								<li>Avoid blurry, dark, or obstructed photos.</li>
								<li>Capture the product front and back if needed.</li>
								<li>Do not upload unrelated or non-food images.</li>
								<li>Limit uploads to 7 photos per day only.</li>
								<li>Make sure text on the packaging is readable.</li>
								<li>Use good lighting to improve scan accuracy.</li>
							</ol>
						</div>
					</ion-accordion>
				</ion-accordion-group>

				<p class="upload-limit-note"><ion-icon :icon="warningOutline" /> Daily upload limit: 7 photos per day</p>

				<input ref="fileInputRef" type="file" accept="image/*" class="hidden-input" @change="onFileSelected" />

				<div class="upload-dropzone" @click="fileInputRef?.click()">
					<template v-if="!previewUrl">
						<ion-icon :icon="cloudUploadOutline" class="upload-icon" />
						<p class="upload-title">Tap to upload a photo</p>
						<p class="upload-subtitle">Take a photo or choose from your gallery</p>
					</template>
					<template v-else>
						<img :src="previewUrl" alt="Selected product photo" class="preview-image" />
						<p class="change-photo-link">Tap to change photo</p>
					</template>
				</div>

				<div v-if="fileError" class="form-error">{{ fileError }}</div>

				<ion-button expand="block" class="primary-button" :disabled="!previewUrl" @click="goToStep2"> Continue </ion-button>
				<p v-if="!previewUrl" class="required-note">A photo is required to continue</p>
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

				<form @submit.prevent="handleSubmit">
					<ion-item lines="none" class="form-field">
						<ion-label position="stacked">Product Name *</ion-label>
						<ion-input v-model="form.productName" placeholder="e.g. Magnolia Full Cream Milk" required />
					</ion-item>

					<div class="date-hint-box">
						<p class="date-hint-title">
							<ion-icon :icon="informationCircleOutline" />
							You must provide at least one date before adding to pantry.
						</p>

						<ion-item lines="none" class="form-field">
							<ion-label position="stacked">Expiration Date</ion-label>
							<ion-note class="field-note">For packaged and processed products (e.g. canned goods, dairy, meat).</ion-note>
							<input v-model="form.expirationDate" type="date" class="native-date-input" />
						</ion-item>

						<div class="or-divider"><span>OR</span></div>

						<ion-item lines="none" class="form-field">
							<ion-label position="stacked">Best Before Date</ion-label>
							<ion-note class="field-note">For fresh stock and produce (e.g. fruits, vegetables, dry goods).</ion-note>
							<input v-model="form.bestBeforeDate" type="date" class="native-date-input" />
						</ion-item>
					</div>

					<p class="section-label">Storage Location</p>
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

					<p class="section-label">Quantity &amp; Unit</p>
					<div class="quantity-row">
						<ion-input v-model.number="form.quantity" type="number" min="0" step="any" class="quantity-input" />
						<ion-select v-model="form.unit" interface="popover" class="unit-select">
							<ion-select-option value="pcs">pcs</ion-select-option>
							<ion-select-option value="g">g</ion-select-option>
							<ion-select-option value="kg">kg</ion-select-option>
							<ion-select-option value="ml">ml</ion-select-option>
							<ion-select-option value="L">L</ion-select-option>
						</ion-select>
					</div>

					<ion-button expand="block" type="submit" class="primary-button" :disabled="isSubmitting">
						<ion-icon :icon="addOutline" slot="start" />
						{{ isSubmitting ? 'Adding...' : 'Add to Pantry' }}
					</ion-button>
				</form>
			</div>
		</ion-content>
	</ion-modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
	IonModal,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonButton,
	IonIcon,
	IonContent,
	IonAccordionGroup,
	IonAccordion,
	IonItem,
	IonLabel,
	IonInput,
	IonSelect,
	IonSelectOption,
	IonNote,
} from '@ionic/vue'
import { arrowBackOutline, informationCircleOutline, warningOutline, cloudUploadOutline, addOutline } from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB raw, before base64 overhead

defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()

const step = ref<1 | 2>(1)
const fileInputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null) // this IS the base64 data URI, reused directly
const fileError = ref<string | null>(null)

const storageLocations = ['Fridge', 'Freezer', 'Cupboard'] as const

const form = reactive({
	productName: '',
	expirationDate: '',
	bestBeforeDate: '',
	storageLocation: 'Cupboard' as (typeof storageLocations)[number],
	quantity: 1,
	unit: 'pcs',
})

const isSubmitting = ref(false)
const formError = ref<string | null>(null)

function resetAll(): void {
	step.value = 1
	previewUrl.value = null
	fileError.value = null
	formError.value = null
	form.productName = ''
	form.expirationDate = ''
	form.bestBeforeDate = ''
	form.storageLocation = 'Cupboard'
	form.quantity = 1
	form.unit = 'pcs'
}

function onFileSelected(event: Event): void {
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

	const reader = new FileReader()
	reader.onload = () => {
		previewUrl.value = reader.result as string
	}
	reader.onerror = () => {
		fileError.value = 'Failed to read the selected file. Please try again.'
	}
	reader.readAsDataURL(file)
}

function goToStep2(): void {
	if (!previewUrl.value) return
	step.value = 2
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
	formError.value = null

	if (!form.productName.trim()) {
		formError.value = 'Please enter a product name.'
		return
	}
	if (!form.expirationDate && !form.bestBeforeDate) {
		formError.value = 'Please provide at least one date.'
		return
	}
	if (form.quantity <= 0) {
		formError.value = 'Please enter a valid quantity.'
		return
	}

	isSubmitting.value = true

	try {
		await apiFetch('/api/pantry_item', {
			method: 'POST',
			body: {
				product_name: form.productName.trim(),
				image_base64: previewUrl.value,
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
.step-caption {
	color: #6b7280;
	font-size: 0.85rem;
	margin-bottom: 8px;
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
	background: #e5e7eb;
}
.progress-segment.filled {
	background: #16a34a;
}
.guidelines-content {
	padding: 0 16px 16px;
	font-size: 0.85rem;
	color: #374151;
}
.guidelines-content ol {
	margin: 0;
	padding-left: 20px;
}
.guidelines-content li {
	margin-bottom: 6px;
}
.upload-limit-note {
	color: #b45309;
	font-size: 0.8rem;
	display: flex;
	align-items: center;
	gap: 4px;
	margin: 12px 0;
}
.hidden-input {
	display: none;
}
.upload-dropzone {
	border: 2px dashed #d1d5db;
	border-radius: 16px;
	padding: 32px 16px;
	text-align: center;
	cursor: pointer;
	margin: 16px 0;
}
.upload-icon {
	font-size: 2rem;
	color: #6b7280;
}
.upload-title {
	font-weight: 600;
	margin: 8px 0 2px;
}
.upload-subtitle {
	color: #6b7280;
	font-size: 0.85rem;
}
.preview-image {
	max-width: 100%;
	max-height: 200px;
	border-radius: 12px;
}
.change-photo-link {
	color: #16a34a;
	font-size: 0.85rem;
	margin-top: 8px;
}
.required-note {
	text-align: center;
	color: #6b7280;
	font-size: 0.8rem;
	margin-top: 8px;
}
.photo-summary {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
}
.thumbnail {
	width: 56px;
	height: 56px;
	object-fit: cover;
	border-radius: 10px;
}
.uploaded-label {
	font-size: 0.85rem;
	color: #374151;
	margin: 0;
}
.change-photo-text {
	color: #16a34a;
	font-size: 0.85rem;
	text-decoration: underline;
}
.form-field {
	--padding-start: 0;
	margin-bottom: 8px;
}
.date-hint-box {
	background: #eff6ff;
	border-radius: 12px;
	padding: 12px;
	margin: 12px 0;
}
.date-hint-title {
	color: #1d4ed8;
	font-size: 0.8rem;
	display: flex;
	align-items: flex-start;
	gap: 6px;
	margin-bottom: 8px;
}
.field-note {
	font-size: 0.75rem;
	color: #6b7280;
}
.native-date-input {
	width: 100%;
	padding: 10px;
	border: 1px solid #d1d5db;
	border-radius: 8px;
	font-size: 0.95rem;
	margin-top: 4px;
}
.or-divider {
	text-align: center;
	color: #9ca3af;
	font-size: 0.75rem;
	margin: 8px 0;
}
.section-label {
	font-weight: 600;
	font-size: 0.85rem;
	margin: 16px 0 8px;
}
.storage-buttons {
	display: flex;
	gap: 8px;
}
.pill {
	border: 1px solid #d1d5db;
	background: #ffffff;
	color: #374151;
	border-radius: 999px;
	padding: 6px 16px;
	font-size: 0.85rem;
	flex: 1;
}
.pill--active {
	border-color: #16a34a;
	color: #16a34a;
	background: #f0fdf4;
	font-weight: 600;
}
.quantity-row {
	display: flex;
	gap: 8px;
}
.quantity-input {
	flex: 1;
	border: 1px solid #d1d5db;
	border-radius: 8px;
	--padding-start: 12px;
}
.unit-select {
	flex: 1;
	border: 1px solid #d1d5db;
	border-radius: 8px;
}
.primary-button {
	--background: #16a34a;
	--border-radius: 12px;
	font-weight: 600;
	margin-top: 20px;
}
.form-error {
	background: #fee2e2;
	color: #b91c1c;
	border-radius: 8px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 0.85rem;
}
</style>
