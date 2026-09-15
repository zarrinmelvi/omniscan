<template>
	<ion-modal :is-open="isOpen" :breakpoints="[0, 0.5, 0.95]" :initial-breakpoint="0.95" :backdrop-dismiss="true" @didDismiss="handleDismiss">
		<ion-content class="sheet-ion-content" scroll-y="true">
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
						:class="tag.isPersonal ? 'badge-allergen--personal' : 'badge-allergen'">
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

				<div v-if="alternatives.length" class="alternatives-section">
					<h3 class="section-title">Alternatives</h3>
					<div v-for="alt in alternatives" :key="alt.name" class="alt-item">
						<div class="alt-item__info">
							<p class="alt-item__name">{{ alt.name }}</p>
							<p class="alt-item__desc">{{ alt.description }}</p>
						</div>
						<div class="alt-item__tags">
							<span v-for="tag in alt.tags" :key="tag" class="alt-tag">{{ tag }}</span>
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
							@click="storageLocation = loc">
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
							<input
								type="date"
								class="date-input"
								:class="{ 'date-input--has-value': !!expirationDate }"
								v-model="expirationDate"
							/>
						</div>

						<div class="or-divider"><span>OR</span></div>

						<div class="date-field">
							<label class="date-field-label">Best Before Date</label>
							<span class="field-hint">For fresh stocks and produce (e.g. fruits, vegetables, dry goods).</span>
							<input
								type="date"
								class="date-input"
								:class="{ 'date-input--has-value': !!bestBeforeDate }"
								v-model="bestBeforeDate"
							/>
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

<script setup>
import { ref, computed, watch } from 'vue'
import { IonModal, IonContent, IonIcon, IonButton, IonSpinner } from '@ionic/vue'
import { apiFetch } from '@/utils/api'
import {
	closeOutline,
	checkmarkCircleOutline,
	warningOutline,
	chevronDownOutline,
	informationCircleOutline,
	addOutline,
	imageOutline,
} from 'ionicons/icons'

const props = defineProps({
	isOpen: { type: Boolean, default: false },
	data: { type: Object, default: () => null },
})

const emit = defineEmits(['close', 'added'])

const TOKEN_KEY = 'omniscan_token'

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
		const data = await apiFetch('/api/users', { method: 'GET' })
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

const isHalalCertified = computed(() => userHalalPref.value && !!halalInfo.value?.matched_known_logo)
const isHalalUnverified = computed(() => userHalalPref.value && !!halalInfo.value?.logo_detected && !halalInfo.value?.matched_known_logo)

const halalCertifiedLabel = computed(() => {
	const certifier = halalInfo.value?.known_certifier
	return certifier ? `${certifier} Certified` : 'Halal Certified'
})

// -------- Allergen detection (derived client-side from ingredients_text) --------
// Placeholder heuristic — keyword matching against the AI-extracted ingredient
// text, same spirit as the backend's Red/Yellow/Green keyword verdict logic.
// Swap for a real allergen-classification step later if needed.
const ALLERGEN_RULES = [
	{ key: 'milk', label: 'Milk', keywords: ['milk'], warning: 'Contains milk — not suitable for those with a milk allergy' },
	{
		key: 'dairy',
		label: 'Dairy',
		keywords: ['dairy', 'cream', 'butter', 'cheese', 'whey', 'casein', 'lactose'],
		warning: 'Contains dairy — not suitable for lactose intolerance',
	},
	{
		key: 'gluten',
		label: 'Gluten',
		keywords: ['wheat', 'gluten', 'barley', 'rye'],
		warning: 'Contains gluten — not suitable for those with celiac disease or gluten sensitivity',
	},
	{ key: 'soy', label: 'Soy', keywords: ['soy', 'soya'], warning: 'Contains soy — not suitable for those with a soy allergy' },
	{ key: 'egg', label: 'Egg', keywords: ['egg'], warning: 'Contains egg — not suitable for those with an egg allergy' },
	{
		key: 'nuts',
		label: 'Nuts',
		keywords: ['peanut', 'almond', 'cashew', 'walnut', 'hazelnut', 'pistachio', 'pecan'],
		warning: 'Contains nuts — not suitable for those with a nut allergy',
	},
	{
		key: 'shellfish',
		label: 'Shellfish',
		keywords: ['shrimp', 'crab', 'lobster', 'shellfish', 'prawn'],
		warning: 'Contains shellfish — not suitable for those with a shellfish allergy',
	},
]

const sourceText = computed(() => {
	const raw = `${product.value?.ingredients_text || ''} ${product.value?.simplified_ingredients || ''}`
	return raw.toLowerCase()
})

const matchedAllergens = computed(() => ALLERGEN_RULES.filter((rule) => rule.keywords.some((k) => sourceText.value.includes(k))))

const allergenTags = computed(() =>
	matchedAllergens.value.map((rule) => ({
		key: rule.key,
		label: rule.label,
		isPersonal: personalAllergenAlerts.value.some((name) => name.toLowerCase() === rule.label.toLowerCase()),
	})),
)

const dietaryWarnings = computed(() => {
	const warnings = matchedAllergens.value.map((rule) => rule.warning)

	const hasDairyOrEgg = matchedAllergens.value.some((rule) => ['milk', 'dairy', 'egg'].includes(rule.key))
	if (hasDairyOrEgg) {
		warnings.push('Not suitable for vegans or dairy-free diets')
	}

	return warnings
})

// -------- Alternatives (placeholder — no real recommendation engine yet) --------
// TODO: replace with a real alternatives/recommendation source once one exists.
const ALTERNATIVE_CATALOG = {
	dairy: [
		{ name: 'Selecta Full Cream Milk', description: 'Similar nutritional profile', tags: ['Halal', 'Gluten-free'] },
		{ name: 'Alaska Powdered Milk', description: 'Shelf-stable option', tags: ['Halal', 'Shelf-stable'] },
		{ name: 'Oatly Oat Drink', description: 'Dairy-free alternative', tags: ['Vegan', 'Dairy-free'] },
	],
}

const alternatives = computed(() => {
	const hasDairy = matchedAllergens.value.some((rule) => ['milk', 'dairy'].includes(rule.key))
	return hasDairy ? ALTERNATIVE_CATALOG.dairy : []
})

const ingredientsOpen = ref(true)

watch(
	() => props.isOpen,
	(open) => {
		if (open) {
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

function resetPantryForm() {
	quantity.value = 1
	unit.value = 'L'
	storageLocation.value = 'Fridge'
	expirationDate.value = ''
	bestBeforeDate.value = ''
	submitError.value = ''
}

const isFormValid = computed(
	() => quantity.value > 0 && !!unit.value && !!storageLocation.value && (!!expirationDate.value || !!bestBeforeDate.value),
)

async function submitAddToPantry() {
	if (!isFormValid.value || !product.value?.product_name) return

	submitError.value = ''
	submitting.value = true

	try {
		const token = localStorage.getItem(TOKEN_KEY)

		if (!token) {
			throw new Error('You must be logged in to add items to your pantry.')
		}

		const response = await fetch('/api/pantry_item', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				product_id: product.value.id,
				quantity: quantity.value,
				unit: unit.value,
				storage_location: storageLocation.value,
				expiration_date: expirationDate.value || undefined,
				best_before_date: bestBeforeDate.value || undefined,
			}),
		})

		if (!response.ok) {
			const body = await response.json().catch(() => null)
			throw new Error(body?.statusMessage || `Failed to add item (status ${response.status}).`)
		}

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
</style>