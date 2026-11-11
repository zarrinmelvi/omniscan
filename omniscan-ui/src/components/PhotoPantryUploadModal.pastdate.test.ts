import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const apiFetch = vi.fn()
const showSuccessToast = vi.fn()
const showErrorToast = vi.fn()

vi.mock('@/utils/api', () => ({
	apiFetch: (...args: unknown[]) => apiFetch(...args),
	API_BASE_URL: '',
	ApiError: class ApiError extends Error {
		status = 0
		data: unknown = null
	},
}))
vi.mock('@/utils/toast', () => ({
	showSuccessToast: (...args: unknown[]) => showSuccessToast(...args),
	showErrorToast: (...args: unknown[]) => showErrorToast(...args),
}))

vi.mock('@ionic/vue', () => {
	const passthrough = (name: string) =>
		defineComponent({ name, inheritAttrs: false, setup: (_, { slots }) => () => h('div', { class: name }, slots.default?.()) })
	return new Proxy(
		{ alertController: { create: vi.fn() } } as Record<string, unknown>,
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

import PhotoPantryUploadModal from './PhotoPantryUploadModal.vue'
import { formatLocalISO, PAST_DATE_MESSAGE } from '@/utils/dateUtils'

function shift(days: number): string {
	const d = new Date()
	d.setDate(d.getDate() + days)
	return formatLocalISO(d)
}

// The modal also fetches its daily upload quota; only count the pantry POST.
const pantryPosts = () => apiFetch.mock.calls.filter((c) => c[0] === '/api/pantry_item')

async function mountFilled(date: string) {
	apiFetch.mockImplementation(async (url: string) => (url === '/api/pantry_item' ? { success: true } : { remaining: 5, remaining_uploads: 5 }))
	const w = mount(PhotoPantryUploadModal, { props: { isOpen: false } })
	await w.setProps({ isOpen: true })
	await flushPromises()
	const vm = w.vm as any
	vm.step = 2
	vm.form.productName = 'Milk'
	vm.form.expirationDate = date
	vm.form.piecesCount = 1
	await flushPromises()
	return { w, vm }
}

describe('PhotoPantryUploadModal past-date handling and success toast', () => {
	beforeEach(() => {
		apiFetch.mockReset()
		showSuccessToast.mockReset()
		showErrorToast.mockReset()
		showSuccessToast.mockResolvedValue(undefined)
		showErrorToast.mockResolvedValue(undefined)
	})

	it('past date: shows the message and the form is invalid', async () => {
		const { w, vm } = await mountFilled(shift(-2))
		expect(vm.isFormValid).toBe(false)
		expect(w.find('.date-past-error').exists()).toBe(true)
		expect(w.find('.date-past-error').text()).toBe(PAST_DATE_MESSAGE)
	})

	it('forced submit with a past date: no API call and an error toast', async () => {
		const { vm } = await mountFilled(shift(-2))
		await vm.handleSubmit()
		expect(pantryPosts()).toHaveLength(0)
		expect(showErrorToast).toHaveBeenCalledWith(PAST_DATE_MESSAGE)
	})

	it('valid date: shows the success toast before emitting created/close', async () => {
		const order: string[] = []
		showSuccessToast.mockImplementation(async () => {
			order.push('toast')
		})
		const { w, vm } = await mountFilled(shift(4))
		expect(w.find('.date-past-error').exists()).toBe(false)
		expect(vm.isFormValid).toBe(true)

		w.vm.$.emit = ((event: string) => {
			order.push(event)
		}) as any
		await vm.handleSubmit()

		expect(pantryPosts()).toHaveLength(1)
		expect(showSuccessToast).toHaveBeenCalledWith('Item successfully added to pantry.')
		expect(order).toEqual(['toast', 'created', 'close'])
	})
})
