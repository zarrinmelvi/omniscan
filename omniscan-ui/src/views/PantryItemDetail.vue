<template>
	<ion-page>
		<!-- Header with Title Left-Aligned Next to Back Arrow -->
		<ion-header class="ion-no-border">
			<ion-toolbar class="detail-toolbar">
				<ion-buttons slot="start">
					<ion-back-button default-href="/tabs/pantry" text="" class="back-btn"></ion-back-button>
				</ion-buttons>
				<ion-title class="detail-title">{{ item?.product?.product_name ?? 'Loading…' }}</ion-title>
			</ion-toolbar>
		</ion-header>

		<ion-content class="detail-content">
			<div v-if="isLoading" class="state-block">
				<ion-spinner name="crescent" />
			</div>

			<div v-else-if="loadError" class="state-block">
				<ion-icon :icon="alertCircleOutline" size="large" color="danger" />
				<p>{{ loadError }}</p>
				<ion-button @click="fetchItem">Try again</ion-button>
			</div>

			<div v-else-if="item" class="detail-wrap">
				<!-- Hero Image Section -->
				<div class="hero-image-container">
					<img v-if="item.product.image_base64" :src="item.product.image_base64" :alt="item.product.product_name" class="hero-photo" />
					<div v-else class="hero-placeholder">
						<span class="placeholder-initial">{{ item.product.product_name.charAt(0) }}</span>
					</div>
				</div>

				<!-- Expiration & Storage Status Banner -->
				<div v-if="expiryBanner" class="status-banner" :class="expiryBanner.tone">
					<div class="status-left">
						<ion-icon :icon="calendarOutline" class="status-icon" />
						<span class="status-text">{{ expiryBanner.text }}</span>
					</div>
					<div class="status-right">
						<span class="storage-label">Storage: </span>
						<span class="storage-value">{{ item.storage_location }}</span>
					</div>
				</div>

				<!-- Navigation Tabs -->
				<div class="tab-row">
					<button type="button" class="tab-btn" :class="{ 'tab-btn--active': activeTab === 'overview' }" @click="activeTab = 'overview'">
						Overview
					</button>
					<button
						type="button"
						class="tab-btn"
						:class="{ 'tab-btn--active': activeTab === 'ingredients' }"
						@click="activeTab = 'ingredients'">
						Ingredients
					</button>
					<button
						type="button"
						class="tab-btn"
						:class="{ 'tab-btn--active': activeTab === 'alternatives' }"
						@click="activeTab = 'alternatives'">
						Alternatives
					</button>
				</div>

				<!-- OVERVIEW -->
				<template v-if="activeTab === 'overview'">
					<div v-if="matchedUserAllergens.length" class="personal-allergen-alert">
						<ion-icon :icon="warningOutline" />
						<div>
							<p class="personal-allergen-alert__title">Contains your allergen{{ matchedUserAllergens.length > 1 ? 's' : '' }}</p>
							<p class="personal-allergen-alert__list">{{ matchedUserAllergens.join(', ') }}</p>
						</div>
					</div>
					<!-- Non-clickable Static Recipe Usage Rows -->
					<div v-if="item.recipes_using_this.length > 0" class="info-card">
						<h3 class="info-card__title">Used in Recipes</h3>
						<div v-for="usage in item.recipes_using_this" :key="usage.recipe_id" class="recipe-usage-row">
							<span class="recipe-usage-row__name">{{ usage.recipe_name }}</span>
							<span class="recipe-usage-badge recipe-usage-badge--neutral">
								{{
									usage.used_quantity !== null
										? `Used ${formatQuantity(usage.used_quantity)}${usage.used_unit ?? ''}`
										: 'Used this item'
								}}
								· {{ formatMadeDate(usage.made_at) }}
							</span>
						</div>
					</div>

					<!-- Halal Status Card (certified / unverified / confirmed not halal) -->
					<div v-if="hasHalalData" class="info-card">
						<h3 class="info-card__title">Halal Status</h3>
						<div
							class="halal-row"
							:class="{
								'halal-row--certified': isHalalCertified,
								'halal-row--not-halal': isConfirmedNotHalal,
								'halal-row--unverified': isHalalUnverified,
							}">
							<ion-icon
								:icon="
									isHalalCertified
										? checkmarkCircleOutline
										: isConfirmedNotHalal
											? closeCircleOutline
											: isHalalUnverified
												? warningOutline
												: helpCircleOutline
								" />
							{{
								isHalalCertified
									? `Halal certified — ${halalCertifierNames}`
									: isConfirmedNotHalal
										? 'Confirmed not Halal'
										: isHalalUnverified
											? 'Halal Mark Detected — Pending Verification'
											: 'Not verified'
							}}
						</div>
					</div>

					<div class="info-card">
						<h3 class="info-card__title">Product Information</h3>
						<div class="info-row">
							<span>Category:</span>
							<strong>{{ item.storage_location }}</strong>
						</div>
						<div class="info-row">
							<span>Days until expiry:</span>
							<strong>{{ daysUntilExpiryLabel }}</strong>
						</div>
						<div class="info-row">
							<span>Quantity:</span>
							<strong>{{ item.quantity }}{{ item.portion_unit }}</strong>
						</div>
					</div>
				</template>

				<!-- INGREDIENTS -->
				<template v-else-if="activeTab === 'ingredients'">
					<div class="info-card">
						<h3 class="info-card__title">Ingredients</h3>
						<p class="ingredients-text">
							{{
								item.product.simplified_ingredients ||
								item.product.ingredient_text ||
								'No ingredient information available for this item.'
							}}
						</p>
					</div>
				</template>

				<!-- ALTERNATIVES -->
				<template v-else>
					<div class="info-card alternatives-placeholder">
						<ion-icon :icon="constructOutline" />
						<p>Alternatives aren't available yet — this feature is still being built.</p>
					</div>
				</template>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
	IonPage,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonBackButton,
	IonContent,
	IonSpinner,
	IonIcon,
	IonButton,
	onIonViewWillEnter,
} from '@ionic/vue'
import {
	alertCircleOutline,
	calendarOutline,
	checkmarkCircleOutline,
	helpCircleOutline,
	constructOutline,
	closeCircleOutline,
	warningOutline,
} from 'ionicons/icons'
import { apiFetch, ApiError } from '@/utils/api'

interface RecipeUsage {
	recipe_id: number
	recipe_name: string
	made_at: string
	used_quantity: number | null
	used_unit: string | null
}

interface PantryItemDetailDto {
	id: number
	quantity: number
	portion_unit: string
	storage_location: string
	expiration_date: string | null
	best_before_date: string | null
	is_archived: boolean
	updated_at: string
	product: Product
	recipes_using_this: RecipeUsage[]
	matched_user_allergens?: string[]
}

interface Product {
	id: number
	product_name: string
	brand_name: string
	image_base64: string | null
	ingredient_text: string | null
	simplified_ingredients: string | null
	halal_logo_id: number | null
	confirmed_not_halal: boolean
	halal_unverified: boolean
	// Certifier names, e.g. ["IDCP", "JAKIM"] — a product can genuinely hold
	// more than one real certification. May be empty even when
	// halal_logo_id is set, for pre-migration rows that predate the join
	// table — isHalalCertified below falls back to halal_logo_id for those.
	halal_certifiers: string[]
}

type Tab = 'overview' | 'ingredients' | 'alternatives'

const route = useRoute()
const item = ref<PantryItemDetailDto | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const activeTab = ref<Tab>('overview')

const matchedUserAllergens = computed(() => item.value?.matched_user_allergens ?? [])

const isHalalCertified = computed(() => (item.value?.product.halal_certifiers.length ?? 0) > 0 || !!item.value?.product.halal_logo_id)
const isConfirmedNotHalal = computed(() => !!item.value?.product.confirmed_not_halal && !isHalalCertified.value)
// Previously unreachable — Product had no field recording "detected but
// unresolved" before this change, so this state could never actually render.
const isHalalUnverified = computed(() => !!item.value?.product.halal_unverified && !isHalalCertified.value && !isConfirmedNotHalal.value)
const hasHalalData = computed(() => isHalalCertified.value || isConfirmedNotHalal.value || isHalalUnverified.value)
const halalCertifierNames = computed(() => {
	const names = item.value?.product.halal_certifiers ?? []
	return names.length > 0 ? names.join(', ') : 'certifying body unavailable'
})

function formatQuantity(n: number): string {
	return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

function formatMadeDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function daysBetween(from: Date, to: Date): number {
	const msPerDay = 1000 * 60 * 60 * 24
	const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate())
	const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate())
	return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / msPerDay)
}

function relevantDate(current: PantryItemDetailDto): Date | null {
	const dateStr = current.expiration_date ?? current.best_before_date
	return dateStr ? new Date(dateStr) : null
}

const daysUntilExpiryLabel = computed(() => {
	if (!item.value) return '—'
	const date = relevantDate(item.value)
	if (!date) return 'No date set'
	const diff = daysBetween(new Date(), date)
	if (diff < 0) return `Expired ${Math.abs(diff)}d ago`
	if (diff === 0) return 'Today'
	return `${diff} day${diff === 1 ? '' : 's'}`
})

const expiryBanner = computed(() => {
	if (!item.value) return null
	const date = relevantDate(item.value)
	if (!date) return null
	const diff = daysBetween(new Date(), date)

	if (diff < 0) return { text: `Expired ${Math.abs(diff)}d ago!`, tone: 'status-banner--danger' }
	if (diff === 0) return { text: 'Expires Today!', tone: 'status-banner--danger' }
	if (diff === 1) return { text: 'Expires Tomorrow!', tone: 'status-banner--danger' }
	if (diff <= 5) return { text: `Expires in ${diff} days`, tone: 'status-banner--warning' }
	return { text: `Expires in ${diff} days`, tone: 'status-banner--success' }
})

async function fetchItem(): Promise<void> {
	isLoading.value = true
	loadError.value = ''

	try {
		const itemId = route.params.id
		const data = await apiFetch<{ success: boolean; item: PantryItemDetailDto }>(`/api/pantry_item/${itemId}`, {
			method: 'GET',
		})
		item.value = data.item
	} catch (err) {
		loadError.value = err instanceof ApiError ? err.message : 'Failed to load this item.'
	} finally {
		isLoading.value = false
	}
}

onIonViewWillEnter(fetchItem)
</script>

<style scoped>
.detail-content {
	--background: #fafafa;
}
.detail-wrap {
	padding: 12px 16px 24px;
	max-width: 480px;
	margin: 0 auto;
}

.detail-toolbar {
	--background: #ffffff;
	--border-width: 0;
	--padding-start: 0px;
	padding: 4px 4px 4px 0;
	border-bottom: 1px solid #f1f5f9;
}
.detail-title {
	font-size: 1.15rem;
	font-weight: 600;
	color: #1e293b;
	padding-left: 0;
}
.back-btn {
	--color: #1e293b;
	font-size: 1.2rem;
}

.hero-image-container {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 190px;
	width: 100%;
	margin: 6px 0 16px;
	border-radius: 20px;
	overflow: hidden;
	background: #f1f5f9;
}
.hero-photo {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.hero-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}
.placeholder-initial {
	font-size: 3rem;
	font-weight: 700;
	color: #94a3b8;
}

.status-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-radius: 14px;
	padding: 12px 14px;
	font-size: 0.85rem;
	margin-bottom: 16px;
}
.status-left {
	display: flex;
	align-items: center;
	gap: 6px;
	font-weight: 600;
}
.status-icon {
	font-size: 1.1rem;
}
.storage-label {
	font-weight: 400;
	opacity: 0.9;
}
.storage-value {
	font-weight: 400;
}

.status-banner--danger {
	background: #fee2e2;
	color: #991b1b;
}
.status-banner--warning {
	background: #fef3c7;
	color: #92400e;
}
.status-banner--success {
	background: #dcfce7;
	color: #166534;
}

.tab-row {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid #e2e8f0;
	margin-bottom: 16px;
}
.tab-btn {
	flex: 1;
	background: none;
	border: none;
	padding: 8px 0;
	font-size: 0.85rem;
	font-weight: 600;
	color: #94a3b8;
	border-bottom: 2px solid transparent;
}
.tab-btn--active {
	color: #00a651;
	border-bottom-color: #00a651;
}

.info-card {
	background: #ffffff;
	border-radius: 16px;
	padding: 16px;
	margin-bottom: 12px;
	border: 1px solid #f1f5f9;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}
.info-card__title {
	font-size: 0.9rem;
	font-weight: 700;
	color: #0f172a;
	margin: 0 0 12px;
}
.info-row {
	display: flex;
	justify-content: space-between;
	font-size: 0.85rem;
	color: #64748b;
	padding: 6px 0;
}
.info-row strong {
	color: #0f172a;
}

.recipe-usage-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	padding: 8px 0;
	border-bottom: 1px solid #f1f5f9;
	font-size: 0.85rem;
}
.recipe-usage-row:last-child {
	border-bottom: none;
}
.recipe-usage-row__name {
	color: #0f172a;
	font-weight: 600;
}
.recipe-usage-badge--neutral {
	color: #64748b;
	font-size: 0.75rem;
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

.halal-row {
	display: flex;
	align-items: center;
	gap: 8px;
	background: #f8fafc;
	color: #64748b;
	border-radius: 12px;
	padding: 10px 12px;
	font-size: 0.85rem;
	font-weight: 600;
}
.halal-row--certified {
	background: #ecfdf5;
	color: #047857;
}
.halal-row--not-halal {
	background: #fef2f2;
	color: #b91c1c;
}
.halal-row--unverified {
	color: #92400e;
	background: #fef3c7;
}

.ingredients-text {
	font-size: 0.85rem;
	color: #334155;
	line-height: 1.5;
	white-space: pre-line;
	margin: 0;
}

.alternatives-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 8px;
	color: #94a3b8;
	padding: 32px 16px;
}
.alternatives-placeholder ion-icon {
	font-size: 2rem;
}

.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 64px 16px;
	text-align: center;
}
</style>
