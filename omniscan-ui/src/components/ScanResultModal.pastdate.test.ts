import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const apiFetch = vi.fn()
const showSuccessToast = vi.fn()
const showErrorToast = vi.fn()

vi.mock('@/utils/api', () => ({
	apiFetch: (...args: unknown[]) => apiFetch(...args),
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
		defineComponent({ name, inheritAttrs: false, setup: (_, { slots, attrs }) => () => h('div', { class: name }, slots.default?.()) })
	const Btn = defineComponent({
		name: 'IonButton',
		props: ['disabled'],
		setup: (props, { slots, attrs }) => () =>
			h('button', { class: 'ion-button', disabled: props.disabled, onClick: (attrs as any).onClick }, slots.default?.()),
	})
	return {
		IonModal: passthrough('IonModal'),
		IonAlert: passthrough('IonAlert'),
		IonContent: passthrough('IonContent'),
		IonIcon: passthrough('IonIcon'),
		IonSpinner: passthrough('IonSpinner'),
		IonDatetime: passthrough('IonDatetime'),
		IonButton: Btn,
		alertController: { create: vi.fn() },
	}
})

import ScanResultModal from './ScanResultModal.vue'
import { formatLocalISO, PAST_DATE_MESSAGE } from '@/utils/dateUtils'

function shift(days: number): string {
	const d = new Date()
	d.setDate(d.getDate() + days)
	return formatLocalISO(d)
}

// The modal also GETs /api/users on open; only count the pantry POST.
const pantryPosts = () => apiFetch.mock.calls.filter((c) => c[0] === '/api/pantry_item')

async function mountWithDate(date: string) {
	const w = mount(ScanResultModal, {
		props: { isOpen: false, data: { product: { id: 1, product_name: 'Milk', expiration_date_detected: date } } },
	})
	await w.setProps({ isOpen: true })
	await flushPromises()
	return w
}

describe('ScanResultModal past-date handling and success toast', () => {
	beforeEach(() => {
		apiFetch.mockReset()
		showSuccessToast.mockReset()
		showErrorToast.mockReset()
		apiFetch.mockResolvedValue({ success: true })
		showSuccessToast.mockResolvedValue(undefined)
		showErrorToast.mockResolvedValue(undefined)
	})

	it('past detected date: shows the message and disables the add button', async () => {
		const w = await mountWithDate(shift(-3))
		expect(w.find('.date-past-error').exists()).toBe(true)
		expect(w.find('.date-past-error').text()).toBe(PAST_DATE_MESSAGE)
		expect(w.find('.submit-btn').attributes('disabled')).toBeDefined()
	})

	it('forced submit with a past date: no API call and an error toast', async () => {
		const w = await mountWithDate(shift(-3))
		await (w.vm as any).submitAddToPantry()
		expect(pantryPosts()).toHaveLength(0)
		expect(showErrorToast).toHaveBeenCalledWith(PAST_DATE_MESSAGE)
	})

	it('valid date: no error, posts, shows the success toast BEFORE emitting added/close', async () => {
		const order: string[] = []
		showSuccessToast.mockImplementation(async () => {
			order.push('toast')
		})
		const w = await mountWithDate(shift(5))
		expect(w.find('.date-past-error').exists()).toBe(false)
		expect(w.find('.submit-btn').attributes('disabled')).toBeUndefined()

		w.vm.$.emit = ((event: string) => {
			order.push(event)
		}) as any
		await (w.vm as any).submitAddToPantry()

		expect(pantryPosts()).toHaveLength(1)
		expect(showSuccessToast).toHaveBeenCalledWith('Item successfully added to pantry.')
		expect(order).toEqual(['toast', 'added', 'close'])
	})
})
