<template>
	<ion-card class="scan-result-card rounded-2xl overflow-hidden shadow-md border" :class="verdict.cardBorder">
		<!-- Verdict banner -->
		<div class="flex items-center gap-3 px-4 py-3" :class="verdict.bannerBg">
			<ion-icon :icon="verdict.icon" class="text-2xl shrink-0" :class="verdict.iconColor" />
			<div class="flex flex-col leading-tight">
				<span class="text-xs font-semibold uppercase tracking-wide" :class="verdict.labelColor">
					{{ verdict.label }}
				</span>
				<span class="text-sm font-medium" :class="verdict.textColor">
					{{ verdict.message }}
				</span>
			</div>
			<ion-badge class="ml-auto" :color="verdict.ionColor">
				{{ data.safety_verdict }}
			</ion-badge>
		</div>

		<!-- Main card content with responsive layout -->
		<div class="card-body">
			<!-- Product image -->
			<div v-if="productImage" class="product-image">
				<img :src="productImage" :alt="data.product?.product_name || 'Product'" class="image-contain" />
			</div>

			<!-- Product info section -->
			<div class="product-info">
				<ion-card-header class="pb-1">
					<ion-card-subtitle class="text-xs uppercase tracking-wide text-gray-400">
						{{ data.product?.brand_name || 'Unknown Brand' }}
					</ion-card-subtitle>
					<ion-card-title class="text-lg font-bold text-gray-900">
						{{ data.product?.product_name || 'Unknown Product' }}
					</ion-card-title>
				</ion-card-header>

				<ion-card-content class="pt-0">
					<!-- Reasons behind the hazard flag -->
					<div v-if="reasonsList.length" class="mt-2">
						<p class="text-xs font-semibold uppercase tracking-wide mb-2" :class="verdict.labelColor">
							Why this product was flagged
						</p>
						<ion-list lines="none" class="bg-transparent p-0">
							<ion-item
								v-for="(reason, index) in reasonsList"
								:key="index"
								class="rounded-lg mb-1.5"
								:class="verdict.itemBg"
								style="--padding-start: 0.75rem; --inner-padding-end: 0.75rem; --min-height: auto">
								<ion-icon :icon="verdict.bulletIcon" slot="start" class="text-base" :class="verdict.iconColor" />
								<ion-label class="text-sm whitespace-normal py-1.5" :class="verdict.textColor">
									{{ reason }}
								</ion-label>
							</ion-item>
						</ion-list>
					</div>

					<div v-else class="mt-2 text-sm text-gray-500 italic">No specific hazard reasons were provided for this scan.</div>

					<!-- Optional metadata footer -->
					<div
						v-if="data.scanned_at || data.barcode"
						class="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
						<span v-if="data.barcode">Barcode: {{ data.barcode }}</span>
						<span v-if="data.scanned_at">{{ formattedDate }}</span>
					</div>
				</ion-card-content>
			</div>

			<!-- Card actions -->
			<div class="card-actions">
				<ion-button size="small" fill="outline" @click="$emit('view-details')">View Details</ion-button>
				<ion-button size="small" @click="$emit('add-to-pantry')">Add to Pantry</ion-button>
			</div>
		</div>
	</ion-card>
</template>

<script setup>
import { computed } from 'vue'
import {
	IonCard,
	IonCardHeader,
	IonCardTitle,
	IonCardSubtitle,
	IonCardContent,
	IonIcon,
	IonBadge,
	IonList,
	IonItem,
	IonLabel,
	IonButton,
} from '@ionic/vue'
import { alertCircle, warning, checkmarkCircle, ellipse } from 'ionicons/icons'

/**
 * Expected shape (matches analysisResult built in ScanPage.vue's handleUpload):
 * {
 *   product: {
 *     id: string,
 *     brand_name: string,
 *     product_name: string,
 *     ingredients_text: string,
 *     simplified_ingredients: string,
 *     image_url?: string,
 *   },
 *   safety_verdict: 'Red' | 'Yellow' | 'Green',
 *   reasons: string[],          // preferred field
 *   hazard_reasons: string[],   // fallback field name
 *   barcode?: string,
 *   scanned_at?: string,
 * }
 */
const props = defineProps({
	data: {
		type: Object,
		required: true,
		default: () => ({}),
	},
})

defineEmits(['view-details', 'add-to-pantry'])

// Product image (if available)
const productImage = computed(() => {
	return props.data?.product?.image_url || props.data?.imageUrl || null
})

// Normalize reasons from either `reasons` or `hazard_reasons`
const reasonsList = computed(() => {
	const list = props.data?.reasons || props.data?.hazard_reasons || []
	return Array.isArray(list) ? list.filter(Boolean) : []
})

const formattedDate = computed(() => {
	if (!props.data?.scanned_at) return ''
	const d = new Date(props.data.scanned_at)
	return isNaN(d)
		? props.data.scanned_at
		: d.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			})
})

// Dynamic styling config per safety_verdict
const verdictMap = {
	red: {
		label: 'Hazard Detected',
		message: 'This product failed safety review',
		icon: alertCircle,
		bulletIcon: alertCircle,
		ionColor: 'danger',
		cardBorder: 'border-red-200',
		bannerBg: 'bg-red-600',
		itemBg: 'bg-red-50',
		iconColor: 'text-white',
		labelColor: 'text-red-50',
		textColor: 'text-white',
	},
	yellow: {
		label: 'Use With Caution',
		message: 'This product has minor concerns',
		icon: warning,
		bulletIcon: warning,
		ionColor: 'warning',
		cardBorder: 'border-amber-200',
		bannerBg: 'bg-amber-400',
		itemBg: 'bg-amber-50',
		iconColor: 'text-amber-900',
		labelColor: 'text-amber-900',
		textColor: 'text-amber-900',
	},
	green: {
		label: 'Looks Safe',
		message: 'No significant concerns found',
		icon: checkmarkCircle,
		bulletIcon: checkmarkCircle,
		ionColor: 'success',
		cardBorder: 'border-emerald-200',
		bannerBg: 'bg-emerald-500',
		itemBg: 'bg-emerald-50',
		iconColor: 'text-white',
		labelColor: 'text-emerald-50',
		textColor: 'text-white',
	},
	default: {
		label: 'Unknown Verdict',
		message: 'Safety status unavailable',
		icon: ellipse,
		bulletIcon: ellipse,
		ionColor: 'medium',
		cardBorder: 'border-gray-200',
		bannerBg: 'bg-gray-400',
		itemBg: 'bg-gray-50',
		iconColor: 'text-white',
		labelColor: 'text-gray-50',
		textColor: 'text-white',
	},
}

const verdict = computed(() => {
	const key = (props.data?.safety_verdict || '').toLowerCase()
	return verdictMap[key] || verdictMap.default
})
</script>

<style scoped>
.scan-result-card {
	--background: #ffffff;
}

/* Main card body with responsive grid layout */
.card-body {
	display: grid;
	gap: 16px;
	padding: 16px;
}

/* Mobile: vertical layout (single column) */
@media (max-width: 767px) {
	.card-body {
		grid-template-columns: 1fr;
		grid-template-areas:
			'image'
			'info'
			'actions';
	}

	.product-image {
		grid-area: image;
		width: 100%;
		aspect-ratio: 1;
	}

	.product-info {
		grid-area: info;
	}

	.card-actions {
		grid-area: actions;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.card-actions ion-button {
		width: 100%;
	}
}

/* Tablet/Desktop: horizontal layout */
@media (min-width: 768px) {
	.card-body {
		grid-template-columns: 120px 1fr auto;
		align-items: start;
		gap: 20px;
	}

	.product-image {
		width: 120px;
		height: 120px;
	}

	.card-actions {
		display: flex;
		flex-direction: row;
		gap: 8px;
		align-items: start;
	}
}

/* Product image styling */
.product-image {
	overflow: hidden;
	border-radius: 8px;
	background: var(--ion-color-light, #f5f5f5);
	display: flex;
	align-items: center;
	justify-content: center;
}

.product-image img {
	width: 100%;
	height: 100%;
}

/* Image contain class for product images */
.image-contain {
	object-fit: contain;
}

/* Remove default card header/content padding when inside grid */
.product-info ion-card-header,
.product-info ion-card-content {
	padding-left: 0;
	padding-right: 0;
}
</style>
