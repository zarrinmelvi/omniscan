<template>
	<div class="recipe-card" @click="$emit('click', recipe)">
		<div class="recipe-img-wrap">
			<img v-if="recipe.image_url" :src="recipe.image_url" :alt="recipe.name" class="recipe-img" />
			<div v-else class="recipe-placeholder">
				<ion-icon :icon="restaurantOutline" />
			</div>
		</div>
		
		<div class="recipe-content">
			<h3 class="recipe-title">{{ recipe.name }}</h3>
			
			<div v-if="recipe.matched_count !== undefined" class="recipe-match">
				<ion-icon :icon="checkmarkCircleOutline" />
				<span>{{ recipe.matched_count }} in pantry</span>
			</div>
			
			<!-- Ingredient Lists -->
			<div v-if="showIngredients && (hasMatchedIngredients || hasMissingIngredients)" class="ingredients-section">
				<!-- Matched Ingredients -->
				<div v-if="hasMatchedIngredients" class="ingredient-group">
					<p class="ingredient-group-title">
						<ion-icon :icon="checkmarkCircle" />
						<span>In Pantry</span>
					</p>
					<ul class="ingredient-list">
						<li v-for="(item, idx) in recipe.matched_ingredients" :key="`matched-${idx}`" class="ingredient-item">
							{{ formatIngredient(item) }}
						</li>
					</ul>
				</div>
				
				<!-- Missing Ingredients -->
				<div v-if="hasMissingIngredients" class="ingredient-group">
					<p class="ingredient-group-title">
						<ion-icon :icon="bagHandleOutline" />
						<span>Still Need</span>
					</p>
					<ul class="ingredient-list">
						<li v-for="(item, idx) in recipe.missing_ingredients" :key="`missing-${idx}`" class="ingredient-item">
							{{ formatIngredient(item) }}
						</li>
					</ul>
				</div>
			</div>
		</div>
		
		<ion-icon :icon="chevronForwardOutline" class="recipe-arrow" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
	restaurantOutline,
	checkmarkCircleOutline,
	checkmarkCircle,
	bagHandleOutline,
	chevronForwardOutline,
} from 'ionicons/icons'

interface RecipeIngredientRef {
	name: string
	quantity: number | null
	unit: string | null
}

interface Recipe {
	id: number
	name: string
	instructions?: string
	matched_ingredients?: RecipeIngredientRef[]
	matched_count?: number
	total_count?: number
	missing_ingredients?: RecipeIngredientRef[]
	liked?: boolean
	made?: boolean
	image_url?: string
	allergen_warnings?: string[]
}

interface Props {
	recipe: Recipe
	showIngredients?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	showIngredients: false,
})

defineEmits<{
	(e: 'click', recipe: Recipe): void
}>()

const hasMatchedIngredients = computed(
	() => props.recipe.matched_ingredients && props.recipe.matched_ingredients.length > 0
)

const hasMissingIngredients = computed(
	() => props.recipe.missing_ingredients && props.recipe.missing_ingredients.length > 0
)

// Fraction display for common values
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
.recipe-card {
	background: #ffffff;
	border-radius: 18px;
	padding: clamp(12px, 3vw, 16px);
	display: flex;
	flex-direction: column;
	gap: 12px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
	cursor: pointer;
	transition: transform 0.2s, box-shadow 0.2s;
	max-width: 400px;
	width: 100%;
	position: relative;
}

.recipe-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.recipe-img-wrap {
	width: 100%;
	aspect-ratio: 16 / 9;
	border-radius: 12px;
	overflow: hidden;
	background: #f2f2f7;
}

.recipe-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.recipe-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 2rem;
	color: #8e8e93;
}

.recipe-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.recipe-title {
	font-size: 0.92rem;
	font-weight: 600;
	color: #0f172a;
	margin: 0;
	overflow-wrap: break-word;
	word-wrap: break-word;
	word-break: break-word;
	hyphens: auto;
	line-height: 1.3;
}

.recipe-match {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 0.75rem;
	color: #22c55e;
	font-weight: 500;
}

.recipe-match ion-icon {
	font-size: 1rem;
}

.ingredients-section {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-top: 8px;
}

.ingredient-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.ingredient-group-title {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 0.75rem;
	font-weight: 600;
	margin: 0;
	color: #374151;
}

.ingredient-group-title ion-icon {
	font-size: 0.9rem;
}

.ingredient-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: grid;
	grid-template-columns: 1fr;
	gap: 4px;
}

/* Mobile: single column ingredients */
@media (max-width: 767px) {
	.ingredient-list {
		grid-template-columns: 1fr;
	}
}

/* Tablet+: two-column grid with 8px gap */
@media (min-width: 768px) {
	.ingredient-list {
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}
}

.ingredient-item {
	font-size: 0.75rem;
	color: #6b7280;
	line-height: 1.4;
	overflow-wrap: break-word;
	word-wrap: break-word;
	word-break: break-word;
	hyphens: auto;
}

.recipe-arrow {
	position: absolute;
	top: clamp(12px, 3vw, 16px);
	right: clamp(12px, 3vw, 16px);
	color: #c7c7cc;
	font-size: 1.1rem;
}
</style>
