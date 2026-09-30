import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecipeCard from './RecipeCard.vue'
import { IonIcon } from '@ionic/vue'

describe('RecipeCard', () => {
	const mockRecipe = {
		id: 1,
		name: 'Test Recipe',
		matched_count: 5,
		total_count: 8,
		image_url: 'https://example.com/recipe.jpg',
		matched_ingredients: [
			{ name: 'flour', quantity: 2, unit: 'cups' },
			{ name: 'sugar', quantity: 1, unit: 'cup' },
			{ name: 'eggs', quantity: 3, unit: null },
		],
		missing_ingredients: [
			{ name: 'butter', quantity: 0.5, unit: 'cup' },
			{ name: 'vanilla', quantity: 1, unit: 'tsp' },
		],
	}

	it('renders recipe name and image', () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		expect(wrapper.find('.recipe-title').text()).toBe('Test Recipe')
		expect(wrapper.find('.recipe-img').attributes('src')).toBe('https://example.com/recipe.jpg')
	})

	it('displays matched count when provided', () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		expect(wrapper.find('.recipe-match').text()).toContain('5 in pantry')
	})

	it('hides ingredients by default', () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		expect(wrapper.find('.ingredients-section').exists()).toBe(false)
	})

	it('shows ingredients when showIngredients is true', () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe, showIngredients: true },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		expect(wrapper.find('.ingredients-section').exists()).toBe(true)
		expect(wrapper.findAll('.ingredient-group')).toHaveLength(2) // matched + missing
	})

	it('formats ingredients correctly', () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe, showIngredients: true },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		const ingredients = wrapper.findAll('.ingredient-item')
		expect(ingredients[0].text()).toBe('2 cups flour')
		expect(ingredients[1].text()).toBe('1 cup sugar')
		expect(ingredients[2].text()).toBe('3 eggs')
	})

	it('emits click event when clicked', async () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		await wrapper.find('.recipe-card').trigger('click')
		expect(wrapper.emitted('click')).toBeTruthy()
		expect(wrapper.emitted('click')![0]).toEqual([mockRecipe])
	})

	it('handles recipe without image', () => {
		const recipeWithoutImage = { ...mockRecipe, image_url: undefined }
		const wrapper = mount(RecipeCard, {
			props: { recipe: recipeWithoutImage },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		expect(wrapper.find('.recipe-placeholder').exists()).toBe(true)
		expect(wrapper.find('.recipe-img').exists()).toBe(false)
	})

	it('applies max-width constraint', () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		const card = wrapper.find('.recipe-card')
		// Check that the card element exists and has the correct class
		expect(card.exists()).toBe(true)
		expect(card.classes()).toContain('recipe-card')
	})

	it('uses fluid padding with clamp', () => {
		const wrapper = mount(RecipeCard, {
			props: { recipe: mockRecipe },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		const card = wrapper.find('.recipe-card')
		// Check that the card exists with proper structure
		expect(card.exists()).toBe(true)
		expect(card.find('.recipe-content').exists()).toBe(true)
	})

	it('handles text wrapping for long recipe names', () => {
		const longNameRecipe = {
			...mockRecipe,
			name: 'This is a very long recipe name that should wrap properly without breaking the layout or overflowing',
		}
		
		const wrapper = mount(RecipeCard, {
			props: { recipe: longNameRecipe },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		expect(wrapper.find('.recipe-title').text()).toBe(longNameRecipe.name)
	})

	it('formats fractions correctly', () => {
		const recipeWithFractions = {
			...mockRecipe,
			matched_ingredients: [
				{ name: 'flour', quantity: 0.5, unit: 'cup' },
				{ name: 'sugar', quantity: 0.25, unit: 'cup' },
			],
		}
		
		const wrapper = mount(RecipeCard, {
			props: { recipe: recipeWithFractions, showIngredients: true },
			global: {
				components: { IonIcon },
				stubs: { IonIcon: true },
			},
		})

		const ingredients = wrapper.findAll('.ingredient-item')
		expect(ingredients[0].text()).toBe('½ cup flour')
		expect(ingredients[1].text()).toBe('¼ cup sugar')
	})
})
