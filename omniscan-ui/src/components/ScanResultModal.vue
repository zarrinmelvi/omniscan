<template>
	<ion-modal :is-open="isOpen" :breakpoints="[0, 0.5, 0.92]" :initial-breakpoint="0.92" :backdrop-dismiss="true" @didDismiss="handleDismiss">
		<ion-content class="sheet-ion-content">
			<div class="sheet-content">
				<div v-if="personalAllergenAlerts.length" class="personal-allergen-alert">
					<ion-icon :icon="warningOutline" />
					<div>
						<p class="personal-allergen-alert__title">Contains your allergen{{ personalAllergenAlerts.length > 1 ? 's' : '' }}</p>
						<p class="personal-allergen-alert__list">{{ personalAllergenAlerts.join(', ') }}</p>
					</div>
				</div>

				<div class="sheet-header">
					<div class="product-thumb">
						<img v-if="product?.image_base64" :src="product.image_base64" :alt="product?.product_name" class="product-thumb__img" />
						<ion-icon v-else :icon="imageOutline" />
					</div>
					<div class="product-title-block">
						<h2 class="product-title">{{ product?.product_name || 'Unknown Product' }}</h2>
						<p class="product-subtitle">
							{{ product?.brand_name || 'Unknown Brand' }}<span v-if="product?.id"> · #{{ product.id }}</span>
						</p>
					</div>
					<button type="button" class="close-btn" aria-label="Close" @click="handleDismiss">
						<ion-icon :icon="closeOutline" />
					</button>
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

				<button type="button" class="ingredients-toggle" @click="ingredientsOpen = !ingredientsOpen">
					<span>Ingredients</span>
					<ion-icon :icon="chevronDownOutline" :class="{ 'is-rotated': ingredientsOpen }" />
				</button>
				<div v-if="ingredientsOpen" class="ingredients-content">
					{{ product?.ingredients_text || product?.simplified_ingredients || 'No ingredient information available for this scan.' }}
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

					<div class="info-box">
						<ion-icon :icon="informationCircleOutline" />
						<span>You must provide at least one date before adding to pantry.</span>
					</div>

					<label class="field-label">
						Expiration Date
						<span class="field-hint">For packaged and processed products (e.g. canned goods, dairy, meat).</span>
					</label>
					<input type="date" class="date-input" v-model="expirationDate" />

					<div class="or-divider"><span>OR</span></div>

					<label class="field-label">
						Best Before Date
						<span class="field-hint">For fresh stocks and produce (e.g. fruits, vegetables, dry goods).</span>
					</label>
					<input type="date" class="date-input" v-model="bestBeforeDate" />

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
const isHalalCertified = computed(() => !!halalInfo.value?.matched_known_logo)
const isHalalUnverified = computed(() => !!halalInfo.value?.logo_detected && !halalInfo.value?.matched_known_logo)

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

const ingredientsOpen = ref(false)

watch(
	() => props.isOpen,
	(open) => {
		if (open) {
			ingredientsOpen.value = false
			resetPantryForm()
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
				product_name: product.value.product_name,
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
}

.sheet-content {
	padding: 8px 20px 24px;
	max-width: 480px;
	margin: 0 auto;
}

.sheet-header {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	margin-bottom: 16px;
}

.product-thumb {
	width: 44px;
	height: 44px;
	border-radius: 10px;
	background: #f1f2f4;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #9aa0a6;
	font-size: 1.3rem;
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
	font-size: 1.05rem;
	font-weight: 700;
	color: #1f2937;
}

.product-subtitle {
	margin: 2px 0 0;
	font-size: 0.8rem;
	color: #9aa0a6;
}

.close-btn {
	background: none;
	border: none;
	color: #9aa0a6;
	font-size: 1.3rem;
	line-height: 1;
	padding: 4px;
}

.badge-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 14px;
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 10px;
	border-radius: 999px;
	font-size: 0.78rem;
	font-weight: 600;
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
	font-weight: 600;
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
	font-weight: 700;
	font-size: 0.85rem;
	color: #92680a;
	margin-bottom: 6px;
}

.warning-box__list {
	margin: 0;
	padding-left: 18px;
	font-size: 0.82rem;
	color: #7a5c0e;
}

.warning-box__list li {
	margin-bottom: 2px;
}

.ingredients-toggle {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #f4f5f7;
	border: none;
	border-radius: 12px;
	padding: 12px 14px;
	font-weight: 600;
	color: #3b5bfd;
	margin-bottom: 8px;
}

.ingredients-toggle ion-icon {
	transition: transform 0.2s ease;
}

.ingredients-toggle ion-icon.is-rotated {
	transform: rotate(180deg);
}

.ingredients-content {
	font-size: 0.85rem;
	color: #4b5563;
	background: #fafafa;
	border-radius: 10px;
	padding: 10px 14px;
	margin-bottom: 16px;
	white-space: pre-line;
}

.section-title {
	font-size: 0.95rem;
	font-weight: 700;
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

.alt-item__name {
	margin: 0;
	font-weight: 600;
	font-size: 0.88rem;
	color: #1f2937;
}

.alt-item__desc {
	margin: 2px 0 0;
	font-size: 0.76rem;
	color: #9aa0a6;
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
	font-weight: 600;
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
	font-size: 0.8rem;
	font-weight: 600;
	color: #92400e;
	margin-bottom: 6px;
}

.field-hint {
	display: block;
	font-weight: 400;
	color: #9aa0a6;
	font-size: 0.74rem;
	margin-top: 2px;
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
	font-size: 0.95rem;
	color: #3b5bfd;
	font-weight: 600;
}

.unit-select {
	flex: 1;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.95rem;
	color: #3b5bfd;
	font-weight: 600;
	background: #fff;
}

.storage-row {
	display: flex;
	gap: 8px;
	margin-bottom: 14px;
}

.storage-btn {
	flex: 1;
	padding: 10px 0;
	border-radius: 10px;
	border: 1px solid #e5e7eb;
	background: #fff;
	font-weight: 600;
	font-size: 0.85rem;
	color: #374151;
}

.storage-btn--active {
	background: #22c55e;
	border-color: #22c55e;
	color: #fff;
}

.info-box {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	background: #eaf1ff;
	color: #2952cc;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.8rem;
	margin-bottom: 14px;
}

.info-box ion-icon {
	margin-top: 1px;
	flex-shrink: 0;
}

.date-input {
	width: 100%;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.9rem;
	color: #374151;
	margin-bottom: 4px;
}

.or-divider {
	display: flex;
	align-items: center;
	text-align: center;
	color: #9aa0a6;
	font-size: 0.78rem;
	font-weight: 600;
	margin: 14px 0;
}

.or-divider::before,
.or-divider::after {
	content: '';
	flex: 1;
	border-top: 1px solid #e5e7eb;
}

.or-divider span {
	padding: 0 10px;
}

.submit-error {
	color: #dc2626;
	font-size: 0.8rem;
	margin: 8px 0 0;
}

.submit-btn {
	margin-top: 18px;
	--border-radius: 12px;
	font-weight: 700;
}
</style>
