import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const apiFetch = vi.fn()
const showSuccessToast = vi.fn()
const showErrorToast = vi.fn()

vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '1' } }) }))
vi.mock('@/utils/useBreakpoint', () => ({ useBreakpoint: () => ({ isDesktop: { value: false } }) }))
vi.mock('@/components/AppHeader.vue', () => ({ default: defineComponent({ render: () => h('div') }) }))
vi.mock('@/utils/api', () => ({
	apiFetch: (...args: unknown[]) => apiFetch(...args),
	ApiError: class ApiError extends Error {},
}))
vi.mock('@/utils/toast', () => ({
	showSuccessToast: (...args: unknown[]) => showSuccessToast(...args),
	showErrorToast: (...args: unknown[]) => showErrorToast(...args),
}))

vi.mock('@ionic/vue', () => {
	const passthrough = (name: string) =>
		defineComponent({ name, inheritAttrs: false, setup: (_, { slots }) => () => h('div', { class: name }, slots.default?.()) })
	return new Proxy(
		{ onIonViewWillEnter: () => {}, alertController: { create: vi.fn() } } as Record<string, unknown>,
		{
			get(target, prop: string) {
				if (prop in target) return target[prop]
				if (prop === '__esModule') return true
				if (prop === 'then') return undefined
				return passthrough(prop)
			},
			has: () => true,
		}
	)
})

import PantryItemDetail from './PantryItemDetail.vue'
import { formatLocalISO, PAST_DATE_MESSAGE } from '@/utils/dateUtils'

function shift(days: number): string {
	const d = new Date()
	d.setDate(d.getDate() + days)
	return formatLocalISO(d)
}

async function mountEditing(savedExpiration: string) {
	const w = mount(PantryItemDetail)
	const vm = w.vm as any
	vm.item = {
		id: 1,
		storage_location: 'Fridge',
		net_content: null,
		net_unit: 'g',
		pieces_count: 1,
		category: 'Dairy',
		expiration_date: savedExpiration,
		best_before_date: null,
		quantity: 1,
		portion_unit: 'piece',
		is_archived: false,
		updated_at: new Date().toISOString(),
		product: {
			id: 1,
			product_name: 'Milk',
			brand_name: 'Brand',
			image_base64: null,
			ingredient_text: '',
			simplified_ingredients: '',
			halal_logo_id: null,
			confirmed_not_halal: false,
			halal_unverified: false,
			halal_certifiers: [],
		},
		recipes_using_this: [],
		matched_user_allergens: [],
		alternatives: [],
		saved_alternatives: [],
	}
	vm.isLoading = false
	// Saving re-fetches the item, so the mocked API must return a full item.
	apiFetch.mockResolvedValue({ success: true, item: vm.item })
	vm.openEditModal()
	await flushPromises()
	return { w, vm }
}

describe('PantryItemDetail edit: only newly chosen past dates are blocked', () => {
	beforeEach(() => {
		apiFetch.mockReset()
		showSuccessToast.mockReset()
		showErrorToast.mockReset()
		showSuccessToast.mockResolvedValue(undefined)
		showErrorToast.mockResolvedValue(undefined)
	})

	it('an unchanged saved past date can still be saved (e.g. after changing pieces)', async () => {
		const { vm } = await mountEditing(shift(-10))
		vm.editForm.pieces_count = 3
		await flushPromises()
		expect(vm.editPastDateError).toBe(false)
		expect(vm.isEditFormValid).toBe(true)
		await vm.saveEdit()
		const puts = apiFetch.mock.calls.filter((c) => c[1]?.method === 'PUT')
		expect(puts).toHaveLength(1)
	})

	it('a newly chosen past date shows the message, invalidates the form and blocks a forced save', async () => {
		const { w, vm } = await mountEditing(shift(10))
		vm.editForm.expiration_date = shift(-2)
		await flushPromises()
		expect(vm.editPastDateError).toBe(true)
		expect(vm.isEditFormValid).toBe(false)
		expect(w.text()).toContain(PAST_DATE_MESSAGE)

		await vm.saveEdit()
		expect(apiFetch.mock.calls.filter((c) => c[1]?.method === 'PUT')).toHaveLength(0)
		expect(showErrorToast).toHaveBeenCalledWith(PAST_DATE_MESSAGE)
	})

	it('a new date of today or later is accepted', async () => {
		const { vm } = await mountEditing(shift(-10))
		vm.editForm.expiration_date = shift(0)
		await flushPromises()
		expect(vm.editPastDateError).toBe(false)
		expect(vm.isEditFormValid).toBe(true)
	})
})
