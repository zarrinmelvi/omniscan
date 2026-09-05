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
				<p class="text-xs font-semibold uppercase tracking-wide mb-2" :class="verdict.labelColor">Why this product was flagged</p>
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
			<div v-if="data.scanned_at || data.barcode" class="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
				<span v-if="data.barcode">Barcode: {{ data.barcode }}</span>
				<span v-if="data.scanned_at">{{ formattedDate }}</span>
			</div>
		</ion-card-content>
	</ion-card>
</template>

<script setup>
import { computed } from 'vue'
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonIcon, IonBadge, IonList, IonItem, IonLabel } from '@ionic/vue'
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
</style>
