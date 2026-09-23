<template>
	<!-- Centered Floating Alert Dialog for Non-Products (Picture 1 Style) -->
	<ion-alert
		:is-open="isOpen && !!data?.isNotProduct"
		header="Analysis Results"
		message="This doesn't look like a food or beverage product. OmniScan only tracks food items — try scanning the packaging of something edible or drinkable."
		:buttons="['CLOSE RESULTS']"
		class="non-product-alert"
		@didDismiss="handleDismiss"
	/>

	<!-- Standard Bottom Sheet Modal for Valid Food Products -->
	<ion-modal
		v-if="!data?.isNotProduct"
		:is-open="isOpen"
		:breakpoints="[0, 0.5, 0.95]"
		:initial-breakpoint="0.95"
		:backdrop-dismiss="true"
		@didDismiss="handleDismiss"
	>
		<ion-content class="sheet-ion-content" :scroll-y="true">
			<div class="sheet-content">
				<div class="sheet-header">
					<div class="product-thumb">
						<img v-if="product?.image_base64" :src="product.image_base64" :alt="product?.product_name" class="product-thumb__img" />
						<ion-icon v-else :icon="imageOutline" />
					</div>
					<div class="product-title-block">
						<h2 class="product-title">{{ product?.product_name || 'Unknown Product' }}</h2>
						<p class="product-subtitle">
							{{ product?.brand_name || 'Unknown Brand' }}<span v-if="product?.id"> - #{{ product.id }}</span>
						</p>
					</div>
					<button type="button" class="close-btn" aria-label="Close" @click="handleDismiss">
						<ion-icon :icon="closeOutline" />
					</button>
				</div>

				<div v-if="personalAllergenAlerts.length" class="personal-allergen-alert">
					<ion-icon :icon="warningOutline" />
					<div>
						<p class="personal-allergen-alert__title">Contains your allergen{{ personalAllergenAlerts.length > 1 ? 's' : '' }}</p>
						<p class="personal-allergen-alert__list">{{ personalAllergenAlerts.join(', ') }}</p>
					</div>
				</div>

				<div v-if="isHalalCertified || isHalalUnverified || allergenTags.length" class="badge-row">
					<span v-if="isHalalCertified" class="badge badge-halal">
						<ion-icon :icon="checkmarkCircleOutline" />
						{{ halalCertifiedLabel }}
					</span>
					<span v-else-if="isHalalUnverified" class="badge badge-halal-pending">
						<ion-icon :icon="warningOutline" />
						Halal Mark Detected — Pending Verification
					</span>
					<span
						v-for="tag in allergenTags"
						:key="tag.key"
						class="badge"
						:class="tag.isPersonal ? 'badge-allergen--personal' : 'badge-allergen'"
					>
						<ion-icon :icon="warningOutline" />
						{{ tag.label }}
					</span>
				</div>

				<div v-if="dietaryWarnings.length" class="warning-box">
					<div class="warning-box__header">
						<ion-icon :icon="warningOutline" />
						Dietary Warnings
					</div>
					<ul class="warning-box__list">
						<li v-for="(warning, i) in dietaryWarnings" :key="i">{{ warning }}</li>
					</ul>
				</div>

				<!-- Ingredients Card Layout matching Picture 1 -->
				<div class="ingredients-card">
					<button type="button" class="ingredients-card__header" @click="ingredientsOpen = !ingredientsOpen">
						<span class="ingredients-card__title">Ingredients</span>
						<ion-icon :icon="chevronDownOutline" :class="{ 'is-rotated': ingredientsOpen }" />
					</button>
					<div v-if="ingredientsOpen" class="ingredients-card__body">
						{{ product?.ingredients_text || product?.simplified_ingredients || 'No ingredient information available for this scan.' }}
					</div>
				</div>

				<div v-if="alternatives.length || alternativesMessage" class="alternatives-section">
					<h3 class="section-title">Alternatives</h3>
					<p v-if="!alternatives.length" class="alternatives-empty">
						{{ alternativesMessage }}
					</p>
					<div v-for="alt in alternatives" :key="alt.id" class="alt-item">
						<div class="alt-item__image-placeholder">
							<ion-icon :icon="imageOutline" />
						</div>
						<div class="alt-item__info">
							<p class="alt-item__name">{{ alt.brand_name }} {{ alt.product_name }}</p>
						</div>
					</div>
				</div>

				<div class="pantry-section">
					<h3 class="section-title">Add to Pantry</h3>

					<label class="field-label">Quantity &amp; Unit</label>
					<div class="quantity-row">
						<input type="number" min="0.01" step="any" class="quantity-input" v-model.number="quantity" />
						<select class="unit-select" v-model="unit">
							<option v-for="opt in unitOptions" :key="opt" :value="opt">{{ opt }}</option>
						</select>
					</div>

					<label class="field-label">Storage Location</label>
					<div class="storage-row">
						<button
							v-for="loc in storageOptions"
							:key="loc"
							type="button"
							class="storage-btn"
							:class="{ 'storage-btn--active': storageLocation === loc }"
							@click="storageLocation = loc"
						>
							{{ loc }}
						</button>
					</div>

					<!-- Blue Date Selection Box -->
					<div class="date-selection-box">
						<div class="info-box">
							<ion-icon :icon="informationCircleOutline" />
							<span>You must provide at least one date before adding to pantry.</span>
						</div>

						<div class="date-field">
							<label class="date-field-label">Expiration Date</label>
							<span class="field-hint">For packaged and processed products (e.g. canned goods, dairy, meat).</span>
							<div v-if="dateAutoDetected" class="ai-detected-banner">
								<ion-icon :icon="sparklesOutline" />
								<span>Expiration Detected — please double-check for accuracy</span>
							</div>
							<input type="date" class="date-input" :class="{ 'date-input--has-value': !!expirationDate }" v-model="expirationDate" />
						</div>

						<div class="or-divider"><span>OR</span></div>

						<div class="date-field">
							<label class="date-field-label">Best Before Date</label>
							<span class="field-hint">For fresh stocks and produce (e.g. fruits, vegetables, dry goods).</span>
							<input type="date" class="date-input" :class="{ 'date-input--has-value': !!bestBeforeDate }" v-model="bestBeforeDate" />
						</div>
					</div>

					<p v-if="submitError" class="submit-error">{{ submitError }}</p>

					<ion-button expand="block" class="submit-btn" :disabled="!isFormValid || submitting" @click="submitAddToPantry">
						<ion-spinner v-if="submitting" name="crescent" slot="start" />
						<ion-icon v-else :icon="addOutline" slot="start" />
						{{ submitting ? 'Adding…' : 'Add to Pantry' }}
					</ion-button>
				</div>
			</div>
		</ion-content>
	</ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { IonModal, IonAlert, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/vue'
import { apiFetch } from '@/utils/api'
import {
	closeOutline,
	checkmarkCircleOutline,
	warningOutline,
	chevronDownOutline,
	informationCircleOutline,
	addOutline,
	imageOutline,
	sparklesOutline,
} from 'ionicons/icons'

// AFTER (Type-Based Syntax)
const props = withDefaults(
	defineProps<{
		isOpen?: boolean
		data?: Record<string, any> | null
	}>(),
	{
		isOpen: false,
		data: null,
	},
)

const emit = defineEmits(['close', 'added'])

const product = computed(() => props.data?.product || null)

const personalAllergenAlerts = computed(() => props.data?.matched_user_allergens || [])
const halalInfo = computed(() => props.data?.halal || null)

// Halal badges (both "certified" and "pending verification") only mean
// anything to a user who actually has Halal as a dietary preference —
// previously these showed identically for every user regardless of their
// profile. Fetched fresh each time the modal opens (see the isOpen watcher
// below) rather than cached, matching how ProfilePage.vue and the rest of
// this app fetch dietary profile data — no shared store for it exists yet.
const userHalalPref = ref(false)

async function fetchHalalPref() {
	try {
		const data = await apiFetch<{ user?: { dietary_prof?: { halal_pref: boolean }[] } }>('/api/users', { method: 'GET' })
		userHalalPref.value = data?.user?.dietary_prof?.[0]?.halal_pref ?? false
	} catch (err) {
		// Fail closed on DISPLAY, not safety: if we can't confirm the
		// user's preference, don't show a Halal badge that may not be
		// relevant to them. This must never block the rest of the modal —
		// Add to Pantry and everything else still needs to work even if
		// this fetch fails.
		console.error('Failed to fetch dietary profile for Halal badge gating:', err)
		userHalalPref.value = false
	}
}

const isHalalCertified = computed(
	() => userHalalPref.value && ((halalInfo.value?.certifiers?.length ?? 0) > 0 || !!halalInfo.value?.matched_known_logo),
)
const isHalalUnverified = computed(() => userHalalPref.value && !!halalInfo.value?.logo_detected && !isHalalCertified.value)

const halalCertifiedLabel = computed(() => {
	const certifiers = halalInfo.value?.certifiers
	if (certifiers && certifiers.length > 0) {
		return `${certifiers.map((c: { certifier: string }) => c.certifier).join(', ')} Certified`
	}
	const certifier = halalInfo.value?.known_certifier
	return certifier ? `${certifier} Certified` : 'Halal Certified'
})

const allergenTags = computed(() =>
	personalAllergenAlerts.value.map((name: string) => ({
		key: name.toLowerCase(),
		label: name,
		isPersonal: true,
	})),
)

const dietaryWarnings = computed(() => [])

const alternatives = computed(() => props.data?.alternatives ?? [])
const alternativesMessage = computed(() => props.data?.alternatives_message ?? null)

const ingredientsOpen = ref(true)

watch(
	() => props.isOpen,
	(open) => {
		if (open && !props.data?.isNotProduct) {
			ingredientsOpen.value = true
			resetPantryForm()
			fetchHalalPref()
		}
	},
)

const unitOptions = ['pc', 'pack', 'g', 'kg', 'ml', 'L']
const storageOptions = ['Fridge', 'Freezer', 'Cupboard']

const quantity = ref(1)
const unit = ref('L')
const storageLocation = ref('Fridge')
const expirationDate = ref('')
const bestBeforeDate = ref('')
const submitting = ref(false)
const submitError = ref('')

// True only while expirationDate still holds exactly what the AI detected —
// cleared the moment the user edits it away from that value, since at that
// point it's their corrected value, not an unverified AI guess anymore.
const dateAutoDetected = ref(false)

function normalizeDetectedDate(value: unknown): string | null {
	// Backend already validates strictly to YYYY-MM-DD or null
	// (normalizeToDateStringOrNull in scan/index.post.ts) — this is just a
	// defensive re-check before trusting it as a form value.
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function resetPantryForm() {
	// Use AI-detected quantity if available, otherwise default to 1
	const detectedQty = product.value?.net_quantity_detected
	quantity.value = typeof detectedQty === 'number' && detectedQty > 0 ? detectedQty : 1

	// Map detected unit to one of the allowed unitOptions, or fall back to 'pcs'
	const detectedUnit = product.value?.net_unit_detected
	const UNIT_OPTIONS = ['pc', 'pack', 'g', 'kg', 'ml', 'L']
	const unitMap: Record<string, string> = { pcs: 'pc', piece: 'pc', pieces: 'pc', liter: 'L', litre: 'L', liters: 'L', litres: 'L', gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg', milliliter: 'ml', millilitre: 'ml', milliliters: 'ml', millilitres: 'ml', ounce: 'oz', ounces: 'oz', 'fl oz': 'ml' }
	const normalizedUnit = typeof detectedUnit === 'string' ? (unitMap[detectedUnit] ?? detectedUnit) : null
	unit.value = normalizedUnit && UNIT_OPTIONS.includes(normalizedUnit) ? normalizedUnit : 'pcs'

	storageLocation.value = 'Fridge'
	// Always into Expiration Date specifically — never Best Before —
	// regardless of whether the label printed "EXP", "Best Before", or
	// "Use By": every scanned item is inherently a packaged product with a
	// printed label, matching this field's own existing hint text.
	const detected = normalizeDetectedDate(product.value?.expiration_date_detected)
	expirationDate.value = detected ?? ''
	bestBeforeDate.value = ''
	dateAutoDetected.value = !!detected
	submitError.value = ''
}

watch(expirationDate, (newValue) => {
	if (!dateAutoDetected.value) return
	const detected = normalizeDetectedDate(product.value?.expiration_date_detected)
	if (newValue !== detected) dateAutoDetected.value = false
})

const isFormValid = computed(
	() => quantity.value > 0 && !!unit.value && !!storageLocation.value && (!!expirationDate.value || !!bestBeforeDate.value),
)

async function submitAddToPantry() {
	if (!isFormValid.value || !product.value?.product_name) return

	submitError.value = ''
	submitting.value = true

	try {
		await apiFetch('/api/pantry_item', {
			method: 'POST',
			body: {
				product_id: product.value.id,
				quantity: quantity.value,
				unit: unit.value,
				storage_location: storageLocation.value,
				expiration_date: expirationDate.value || undefined,
				best_before_date: bestBeforeDate.value || undefined,
			},
		})

		emit('added')
		handleDismiss()
	} catch (err) {
		submitError.value = err instanceof Error ? err.message : 'Failed to add item to pantry.'
	} finally {
		submitting.value = false
	}
}

function handleDismiss() {
	emit('close')
}
</script>

<style scoped>
.sheet-ion-content {
	--background: #ffffff;
	--padding-bottom: 40px;
}

.sheet-content {
	padding: 16px 20px 48px;
	max-width: 480px;
	margin: 0 auto;
}

/* Green action button style for the Ionic alert */
:deep(.non-product-alert .alert-button) {
	color: #00b14f;
	font-weight: 700;
}

.sheet-header {
	display: flex;
	align-items: center;
	gap: 12px;
	padding-bottom: 16px;
	margin-bottom: 16px;
	border-bottom: 1px solid #f1f5f9;
}

.product-thumb {
	width: 52px;
	height: 52px;
	border-radius: 14px;
	background: #f8fafc;
	border: 1px solid #f1f5f9;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #94a3b8;
	font-size: 1.6rem;
	flex-shrink: 0;
	overflow: hidden;
}

.product-thumb__img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.product-title-block {
	flex: 1;
	min-width: 0;
}

.product-title {
	margin: 0;
	font-size: 0.95rem;
	font-weight: 600;
	color: #0f172a;
	line-height: 1.25;
}

.product-subtitle {
	margin: 3px 0 0;
	font-size: 0.8rem;
	color: #64748b;
}

.close-btn {
	background: none;
	border: none;
	color: #64748b;
	font-size: 1.2rem;
	line-height: 1;
	padding: 4px;
	cursor: pointer;
}

.badge-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 14px;
}

/* Unbolded Allergen Badges matching Picture 3 */
.badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	border-radius: 999px;
	font-size: 0.78rem;
	font-weight: 400;
}

.badge-halal-pending {
	background: #fef7e0;
	color: #92680a;
}

.badge-halal {
	background: #e6f7ee;
	color: #1a9c5e;
}

.badge-allergen {
	background: #fdeee0;
	color: #d9762b;
}

.badge-allergen--personal {
	background: #fee2e2;
	color: #b91c1c;
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

.warning-box {
	background: #fef7e0;
	border: 1px solid #f6e2a0;
	border-radius: 12px;
	padding: 12px 14px;
	margin-bottom: 16px;
}

.warning-box__header {
	display: flex;
	align-items: center;
	gap: 6px;
	font-weight: 600;
	font-size: 0.85rem;
	color: #92680a;
	margin-bottom: 6px;
}

.warning-box__list {
	margin: 0;
	padding-left: 18px;
	font-size: 0.82rem;
	color: #7a5c0e;
	font-weight: 400;
}

.warning-box__list li {
	margin-bottom: 2px;
}

/* Ingredients Card Container matching Picture 1 */
.ingredients-card {
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 14px;
	overflow: hidden;
	margin-bottom: 16px;
}

.ingredients-card__header {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: transparent;
	border: none;
	padding: 12px 14px;
	cursor: pointer;
}

.ingredients-card__title {
	font-size: 0.875rem;
	font-weight: 500;
	color: #334155;
}

.ingredients-card__header ion-icon {
	color: #64748b;
	font-size: 0.95rem;
	transition: transform 0.2s ease;
}

.ingredients-card__header ion-icon.is-rotated {
	transform: rotate(180deg);
}

.ingredients-card__body {
	font-size: 0.825rem;
	color: #475569;
	font-weight: 400;
	padding: 0 14px 14px 14px;
	line-height: 1.45;
	white-space: pre-line;
}

.section-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: #1f2937;
	margin: 0 0 10px;
}

.alternatives-section {
	margin-bottom: 18px;
}

.alt-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 0;
	border-bottom: 1px solid #f1f2f4;
	gap: 12px;
}

.alt-item:last-child {
	border-bottom: none;
}

/* Lessened font weight for Alternatives in Picture 2 */
.alt-item__name {
	margin: 0;
	font-weight: 500;
	font-size: 0.88rem;
	color: #1f2937;
}

.alt-item__desc {
	margin: 2px 0 0;
	font-size: 0.76rem;
	color: #94a3b8;
	font-weight: 400;
}

.alt-item__tags {
	display: flex;
	gap: 6px;
	flex-shrink: 0;
}

.alt-tag {
	background: #e6f7ee;
	color: #1a9c5e;
	font-size: 0.72rem;
	font-weight: 500;
	padding: 3px 8px;
	border-radius: 999px;
	white-space: nowrap;
}

.pantry-section {
	border-top: 1px solid #f1f2f4;
	padding-top: 16px;
}

.field-label {
	display: block;
	font-size: 0.825rem;
	font-weight: 600;
	color: #92400e;
	margin-bottom: 6px;
}

.field-hint {
	display: block;
	font-weight: 400;
	color: #94a3b8;
	font-size: 0.75rem;
	line-height: 1.35;
	margin-top: 2px;
	margin-bottom: 6px;
}

.quantity-row {
	display: flex;
	gap: 10px;
	margin-bottom: 14px;
}

/* Lessened font weight for form inputs in Picture 2 */
.quantity-input {
	flex: 1;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.95rem;
	color: #3b5bfd;
	font-weight: 500;
	background-color: #ffffff !important;
	color-scheme: light;
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
	font-size: 0.95rem;
	color: #3b5bfd;
	font-weight: 500;
	background-color: #ffffff !important;
	color-scheme: light;
}

.storage-row {
	display: flex;
	gap: 8px;
	margin-bottom: 14px;
}

.storage-btn {
	flex: 1;
	padding: 10px 0;
	border-radius: 12px;
	border: 1px solid #e5e7eb;
	background: #fff;
	font-weight: 500;
	font-size: 0.85rem;
	color: #374151;
}

.storage-btn--active {
	background: #00b14f;
	border-color: #00b14f;
	color: #ffffff;
}

/* Date Box Section */
.date-selection-box {
	background: #eff6ff;
	border: 1px solid #dbeafe;
	border-radius: 16px;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 14px;
	margin-bottom: 16px;
}

.info-box {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	color: #2563eb;
	font-size: 0.825rem;
	line-height: 1.35;
	background: transparent;
	padding: 0;
	margin-bottom: 2px;
	font-weight: 400;
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
	font-size: 0.825rem;
	font-weight: 600;
	color: #92400e;
}

.date-input {
	width: 100%;
	border: 1px solid #cbd5e1;
	border-radius: 12px;
	padding: 10px 14px;
	font-size: 0.9rem;
	color: #374151;
	background-color: #ffffff !important;
	color-scheme: light;
	box-sizing: border-box;
	font-weight: 400;
	transition: all 0.2s ease;
}

.date-input--has-value,
.date-input:focus {
	border-color: #22c55e;
	box-shadow: 0 0 0 1px #22c55e;
	outline: none;
}

.ai-detected-banner {
	display: flex;
	align-items: center;
	gap: 6px;
	background: #fffbeb;
	border: 1px solid #fde68a;
	border-radius: 10px;
	padding: 6px 10px;
	margin: 6px 0;
	color: #92400e;
	font-size: 0.78rem;
	font-weight: 500;
}

.ai-detected-banner ion-icon {
	flex-shrink: 0;
	font-size: 0.95rem;
}

.or-divider {
	display: flex;
	align-items: center;
	text-align: center;
	color: #9aa0a6;
	font-size: 0.78rem;
	font-weight: 500;
	margin: 2px 0;
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

.submit-error {
	color: #dc2626;
	font-size: 0.8rem;
	margin: 8px 0 0;
}

.submit-btn {
	margin-top: 24px;
	--border-radius: 12px;
	--background: #00b14f;
	--background-activated: #009643;
	--background-disabled: #e2e8f0;
	--color-disabled: #94a3b8;
	font-weight: 600;
	height: 48px;
}

.alt-item__image-placeholder {
	width: 40px;
	height: 40px;
	border-radius: 8px;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #9ca3af;
	flex-shrink: 0;
}

.alternatives-empty {
	color: #6b7280;
	font-size: 0.85rem;
	margin: 0;
}
</style>