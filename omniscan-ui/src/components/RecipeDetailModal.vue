<template>
	<ion-modal :is-open="isOpen" class="recipe-detail-modal" @didDismiss="emit('close')">
		<div v-if="recipe" class="detail-container">
			<!-- Hero Banner Header -->
			<div
				class="detail-hero"
				:class="{ 'detail-hero--no-img': !recipe.image_url }"
				:style="recipe.image_url ? { backgroundImage: `url(${recipe.image_url})` } : {}">
				<div class="hero-actions">
					<button type="button" class="icon-btn" aria-label="Toggle Like" @click.stop="emit('toggle-like', recipe)">
						<ion-icon :icon="recipe.liked ? heart : heartOutline" :class="{ 'heart-icon--liked': recipe.liked }" />
					</button>

					<button type="button" class="icon-btn" aria-label="Close modal" @click="emit('close')">
						<ion-icon :icon="closeOutline" />
					</button>
				</div>

				<h2 class="hero-title">{{ recipe.name }}</h2>
			</div>

			<!-- Body Details -->
			<div class="detail-content">
				<!-- Allergen Warning: informational only, never blocks Make Recipe -->
				<div v-if="recipe.allergen_warnings?.length" class="allergen-warning">
					<ion-icon :icon="warningOutline" />
					<div>
						<p class="allergen-warning-title">Contains an allergen you've flagged</p>
						<p class="allergen-warning-text">
							This recipe contains {{ recipe.allergen_warnings.join(', ') }}. You can still make it if you choose to.
						</p>
					</div>
				</div>

				<!-- Chip-Based Ingredients: Pantry Matches -->
				<div v-if="recipe.matched_ingredients?.length" class="section-group">
					<div class="section-title text-green">
						<ion-icon :icon="checkmarkCircle" />
						<span>From your pantry</span>
					</div>
					<div class="chips-flex-container">
						<span v-for="(item, idx) in recipe.matched_ingredients" :key="idx" class="ingredient-chip green-chip">
							{{ formatIngredient(item) }}
						</span>
					</div>
				</div>

				<!-- Chip-Based Ingredients: Still Need -->
				<div v-if="recipe.missing_ingredients?.length" class="section-group">
					<div class="section-title text-orange">
						<ion-icon :icon="bagHandleOutline" />
						<span>Still need</span>
					</div>
					<div class="chips-flex-container">
						<span v-for="(item, idx) in recipe.missing_ingredients" :key="idx" class="ingredient-chip orange-chip">
							{{ formatIngredient(item) }}
						</span>
					</div>
				</div>

				<!-- Cleaned Instructions Steps -->
				<div class="section-group">
					<p class="section-label">Instructions</p>
					<div v-for="(step, idx) in parsedSteps(recipe.instructions)" :key="idx" class="step-row">
						<span class="step-num">{{ idx + 1 }}</span>
						<p class="step-text">{{ step }}</p>
					</div>
				</div>
			</div>

			<!-- Fixed Bottom Actions -->
			<div class="detail-footer">
				<ion-button expand="block" class="make-btn" @click="emit('make', recipe)">
					<ion-icon :icon="restaurantOutline" slot="start" />
					{{ recipe.made ? 'Make Recipe Again' : 'Make Recipe' }}
				</ion-button>

				<button v-if="recipe.made" type="button" class="unmake-btn" @click="emit('unmake', recipe)">Remove from Made History</button>
			</div>
		</div>
	</ion-modal>
</template>

<script setup lang="ts">
import { IonModal, IonButton, IonIcon } from '@ionic/vue'
import { closeOutline, heart, heartOutline, checkmarkCircle, bagHandleOutline, restaurantOutline, warningOutline } from 'ionicons/icons'

interface RecipeIngredientRef {
	name: string
	quantity: number | null
	unit: string | null
}

interface SuggestedRecipe {
	id: number
	name: string
	instructions: string
	matched_ingredients?: RecipeIngredientRef[]
	matched_count: number
	total_count: number
	missing_ingredients: RecipeIngredientRef[]
	liked: boolean
	made: boolean
	image_url?: string
	allergen_warnings?: string[]
}

defineProps<{
	isOpen: boolean
	recipe: SuggestedRecipe | null
}>()

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'make', recipe: SuggestedRecipe): void
	(e: 'unmake', recipe: SuggestedRecipe): void
	(e: 'toggle-like', recipe: SuggestedRecipe): void
}>()

function parsedSteps(instructions: string): string[] {
	if (!instructions) return []

	return instructions
		.split(/(?:\r?\n|\s*(?=\d+\.\s+))/)
		.map((step) => step.replace(/^\d+\.\s*/, '').trim())
		.filter((step) => step.length > 0)
}

// Turns a parsed quantity like 0.5 back into a friendlier "½" for the small
// set of fractions the ingredient parser commonly produces (see
// VULGAR_FRACTIONS in import-recipes.ts) — purely cosmetic, falls back to a
// plain number for anything else so nothing is ever hidden or dropped.
const FRACTION_DISPLAY: [number, string][] = [
	[0.25, '¼'],
	[1 / 3, '⅓'],
	[0.5, '½'],
	[2 / 3, '⅔'],
	[0.75, '¾'],
]

function formatQuantity(quantity: number): string {
	for (const [value, symbol] of FRACTION_DISPLAY) {
		if (Math.abs(quantity - value) < 0.01) return symbol
	}
	return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function formatIngredient(item: RecipeIngredientRef): string {
	if (item.quantity == null) return item.name
	const qty = formatQuantity(item.quantity)
	return item.unit ? `${qty} ${item.unit} ${item.name}` : `${qty} ${item.name}`
}
</script>

<style scoped>
.recipe-detail-modal {
	--border-radius: 24px;
	--height: 92%;
}

.detail-container {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: #ffffff;
	overflow-y: auto;
}

.detail-hero {
	position: relative;
	height: 220px;
	background-size: cover;
	background-position: center;
	background-color: #1f2937;
	padding: 16px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.detail-hero::before {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.75) 100%);
}

.hero-actions {
	position: relative;
	z-index: 2;
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.icon-btn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.4);
	color: #ffffff;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.2rem;
	backdrop-filter: blur(6px);
	cursor: pointer;
}

.heart-icon--liked {
	color: #ef4444;
}

.hero-title {
	position: relative;
	z-index: 2;
	color: #ffffff;
	font-size: 1.5rem;
	font-weight: 700;
	margin: auto 0 0;
	padding-right: 12px;
}

.detail-content {
	padding: 20px;
	flex: 1;
}

.allergen-warning {
	display: flex;
	gap: 10px;
	align-items: flex-start;
	background: #fffbeb;
	border: 1px solid #fde68a;
	border-radius: 12px;
	padding: 12px 14px;
	margin-bottom: 20px;
	color: #92400e;
	font-size: 1.1rem;
}

.allergen-warning-title {
	font-size: 0.85rem;
	font-weight: 700;
	margin: 0 0 2px;
}

.allergen-warning-text {
	font-size: 0.8rem;
	line-height: 1.4;
	margin: 0;
	font-weight: 400;
}

.section-group {
	margin-bottom: 20px;
}

.section-label {
	font-size: 0.85rem;
	font-weight: 700;
	color: #374151;
	margin-bottom: 12px;
}

.section-title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.9rem;
	font-weight: 600;
	margin-bottom: 10px;
}

.text-green {
	color: #05c450;
}

.text-orange {
	color: #f97316;
}

/* Chips Flex Wrap Layout */
.chips-flex-container {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.ingredient-chip {
	display: inline-flex;
	align-items: center;
	padding: 6px 14px;
	border-radius: 9999px;
	font-size: 0.82rem;
	font-weight: 500;
	line-height: 1.3;
}

.green-chip {
	background: #f0fdf4;
	color: #166534;
}

.orange-chip {
	background: #fff7ed;
	color: #9a3412;
}

/* Instructions Step Rows */
.step-row {
	display: flex;
	gap: 12px;
	margin-bottom: 12px;
}

.step-num {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: #05c450;
	color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.8rem;
	font-weight: 700;
	flex-shrink: 0;
}

.step-text {
	font-size: 0.88rem;
	color: #374151;
	margin: 0;
	line-height: 1.4;
}

/* Footer Container */
.detail-footer {
	position: sticky;
	bottom: 0;
	padding: 16px 20px;
	background: #ffffff;
	border-top: 1px solid #f3f4f6;
}

.make-btn {
	--background: #05c450;
	--border-radius: 9999px;
	font-weight: 600;
	height: 48px;
}

.unmake-btn {
	width: 100%;
	margin-top: 12px;
	background: transparent;
	border: none;
	color: #ef4444;
	font-size: 0.85rem;
	font-weight: 600;
	cursor: pointer;
	padding: 8px 0;
}
</style>
