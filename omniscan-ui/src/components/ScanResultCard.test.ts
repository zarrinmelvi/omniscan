import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanResultCard from './ScanResultCard.vue'

describe('ScanResultCard Responsive Layout', () => {
	const mockData = {
		product: {
			id: '123',
			brand_name: 'Test Brand',
			product_name: 'Test Product',
			ingredients_text: 'Sugar, Salt',
			simplified_ingredients: 'Sugar, Salt',
			image_url: 'https://example.com/product.jpg',
		},
		safety_verdict: 'Red',
		reasons: ['Contains harmful ingredient A', 'Contains harmful ingredient B'],
		barcode: '1234567890',
		scanned_at: '2024-01-01T00:00:00Z',
	}

	it('renders product information correctly', () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		expect(wrapper.text()).toContain('Test Brand')
		expect(wrapper.text()).toContain('Test Product')
		expect(wrapper.text()).toContain('Contains harmful ingredient A')
		expect(wrapper.text()).toContain('Contains harmful ingredient B')
	})

	it('displays product image when image_url is provided', () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		const img = wrapper.find('.product-image img')
		expect(img.exists()).toBe(true)
		expect(img.attributes('src')).toBe(mockData.product.image_url)
		expect(img.classes()).toContain('image-contain')
	})

	it('hides product image when no image_url is provided', () => {
		const dataWithoutImage = {
			...mockData,
			product: {
				...mockData.product,
				image_url: undefined,
			},
		}

		const wrapper = mount(ScanResultCard, {
			props: {
				data: dataWithoutImage,
			},
		})

		const productImage = wrapper.find('.product-image')
		expect(productImage.exists()).toBe(false)
	})

	it('renders action buttons', () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		const buttons = wrapper.findAll('.card-actions ion-button')
		expect(buttons).toHaveLength(2)
		expect(buttons[0].text()).toContain('View Details')
		expect(buttons[1].text()).toContain('Add to Pantry')
	})

	it('emits view-details event when View Details button is clicked', async () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		const viewDetailsBtn = wrapper.findAll('.card-actions ion-button')[0]
		await viewDetailsBtn.trigger('click')

		expect(wrapper.emitted('view-details')).toBeTruthy()
		expect(wrapper.emitted('view-details')).toHaveLength(1)
	})

	it('emits add-to-pantry event when Add to Pantry button is clicked', async () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		const addToPantryBtn = wrapper.findAll('.card-actions ion-button')[1]
		await addToPantryBtn.trigger('click')

		expect(wrapper.emitted('add-to-pantry')).toBeTruthy()
		expect(wrapper.emitted('add-to-pantry')).toHaveLength(1)
	})

	it('applies responsive grid layout classes', () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		const cardBody = wrapper.find('.card-body')
		expect(cardBody.exists()).toBe(true)

		// Verify grid structure elements exist
		expect(wrapper.find('.product-image').exists()).toBe(true)
		expect(wrapper.find('.product-info').exists()).toBe(true)
		expect(wrapper.find('.card-actions').exists()).toBe(true)
	})

	it('displays verdict banner with correct styling', () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		const banner = wrapper.find('.bg-red-600')
		expect(banner.exists()).toBe(true)
		expect(banner.text()).toContain('Hazard Detected')
		expect(banner.text()).toContain('This product failed safety review')
	})

	it('displays barcode and scanned date in metadata footer', () => {
		const wrapper = mount(ScanResultCard, {
			props: {
				data: mockData,
			},
		})

		expect(wrapper.text()).toContain('Barcode: 1234567890')
		expect(wrapper.text()).toContain('Jan')
	})

	it('handles missing optional fields gracefully', () => {
		const minimalData = {
			product: {
				id: '123',
				brand_name: 'Test Brand',
				product_name: 'Test Product',
				ingredients_text: '',
				simplified_ingredients: '',
			},
			safety_verdict: 'Green',
			reasons: [],
		}

		const wrapper = mount(ScanResultCard, {
			props: {
				data: minimalData,
			},
		})

		expect(wrapper.text()).toContain('Test Brand')
		expect(wrapper.text()).toContain('Test Product')
		expect(wrapper.text()).toContain('No specific hazard reasons were provided')
	})

	it('normalizes reasons from hazard_reasons field', () => {
		const dataWithHazardReasons = {
			...mockData,
			reasons: undefined,
			hazard_reasons: ['Reason 1', 'Reason 2'],
		}

		const wrapper = mount(ScanResultCard, {
			props: {
				data: dataWithHazardReasons,
			},
		})

		expect(wrapper.text()).toContain('Reason 1')
		expect(wrapper.text()).toContain('Reason 2')
	})
})
