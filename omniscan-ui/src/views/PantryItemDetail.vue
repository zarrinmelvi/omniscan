<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-buttons slot="start">
					<ion-back-button default-href="/tabs/pantry" text=""></ion-back-button>
				</ion-buttons>
				<ion-title>{{ item?.product.product_name ?? 'Loading…' }}</ion-title>
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
				<div class="product-image">
					<img v-if="item.product.image_base64" :src="item.product.image_base64" :alt="item.product.product_name" />
					<span v-else class="placeholder-initial">{{ item.product.product_name.charAt(0) }}</span>
				</div>

				<div v-if="expiryBanner" class="expiry-banner" :class="expiryBanner.tone">
					<ion-icon :icon="calendarOutline" />
					<span>{{ expiryBanner.text }}</span>
					<span class="expiry-banner__storage">Storage: {{ item.storage_location }}</span>
				</div>

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
					<div class="info-card">
						<h3 class="info-card__title">Halal Status</h3>
						<div class="halal-row" :class="{ 'halal-row--certified': isHalalCertified }">
							<ion-icon :icon="isHalalCertified ? checkmarkCircleOutline : helpCircleOutline" />
							{{ isHalalCertified ? 'Halal certified' : 'Not verified' }}
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSpinner, IonIcon, IonButton } from '@ionic/vue'
import { alertCircleOutline, calendarOutline, checkmarkCircleOutline, helpCircleOutline, constructOutline } from 'ionicons/icons'
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
}

interface Product {
	id: number
	product_name: string
	brand_name: string
	image_base64: string | null
	ingredient_text: string | null
	simplified_ingredients: string | null
	halal_logo_id: number | null
}

type Tab = 'overview' | 'ingredients' | 'alternatives'

const route = useRoute()
const item = ref<PantryItemDetailDto | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const activeTab = ref<Tab>('overview')

const isHalalCertified = computed(() => !!item.value?.product.halal_logo_id)

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

	if (diff < 0) return { text: `Expired ${Math.abs(diff)}d ago`, tone: 'expiry-banner--danger' }
	if (diff === 0) return { text: 'Expires Today!', tone: 'expiry-banner--danger' }
	if (diff <= 3) return { text: `Expires in ${diff} day${diff === 1 ? '' : 's'}`, tone: 'expiry-banner--warning' }
	return { text: `Expires in ${diff} days`, tone: 'expiry-banner--success' }
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

onMounted(fetchItem)
</script>

<style scoped>
.recipe-usage-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
	padding: 8px 0;
	border-bottom: 1px solid #f3f4f6;
	font-size: 0.85rem;
}
.recipe-usage-row:last-child {
	border-bottom: none;
}
.recipe-usage-row__name {
	color: #111827;
	font-weight: 600;
}
.recipe-usage-badge {
	font-size: 0.75rem;
	font-weight: 600;
	white-space: nowrap;
}
.recipe-usage-badge--neutral {
	color: #6b7280;
}

.detail-content {
	--background: #f9fafb;
}
.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 48px 16px;
	text-align: center;
}
.detail-wrap {
	padding: 16px;
	max-width: 480px;
	margin: 0 auto;
}

.product-image {
	width: 100%;
	height: 200px;
	border-radius: 16px;
	background: #f3f4f6;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	margin-bottom: 16px;
}
.product-image img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.placeholder-initial {
	font-size: 3rem;
	font-weight: 700;
	color: #9ca3af;
}

.expiry-banner {
	display: flex;
	align-items: center;
	gap: 8px;
	border-radius: 12px;
	padding: 10px 14px;
	font-size: 0.85rem;
	font-weight: 600;
	margin-bottom: 16px;
}
.expiry-banner ion-icon {
	font-size: 1.1rem;
}
.expiry-banner__storage {
	margin-left: auto;
	font-weight: 500;
	opacity: 0.8;
}
.expiry-banner--danger {
	background: #fee2e2;
	color: #b91c1c;
}
.expiry-banner--warning {
	background: #fef3c7;
	color: #92400e;
}
.expiry-banner--success {
	background: #d1fae5;
	color: #065f46;
}

.tab-row {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid #e5e7eb;
	margin-bottom: 16px;
}
.tab-btn {
	flex: 1;
	background: none;
	border: none;
	padding: 10px 0;
	font-size: 0.85rem;
	font-weight: 600;
	color: #9ca3af;
	border-bottom: 2px solid transparent;
}
.tab-btn--active {
	color: #16a34a;
	border-bottom-color: #16a34a;
}

.info-card {
	background: #ffffff;
	border-radius: 14px;
	padding: 16px;
	margin-bottom: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.info-card__title {
	font-size: 0.95rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 12px;
}
.info-row {
	display: flex;
	justify-content: space-between;
	font-size: 0.85rem;
	color: #6b7280;
	padding: 6px 0;
}
.info-row strong {
	color: #111827;
}

.halal-row {
	display: flex;
	align-items: center;
	gap: 8px;
	background: #f3f4f6;
	color: #6b7280;
	border-radius: 10px;
	padding: 10px 12px;
	font-size: 0.85rem;
	font-weight: 600;
}
.halal-row--certified {
	background: #ecfdf5;
	color: #065f46;
}

.ingredients-text {
	font-size: 0.85rem;
	color: #4b5563;
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
	color: #9ca3af;
	padding: 32px 16px;
}
.alternatives-placeholder ion-icon {
	font-size: 2rem;
}
.alternatives-placeholder p {
	margin: 0;
	font-size: 0.85rem;
}
</style>
