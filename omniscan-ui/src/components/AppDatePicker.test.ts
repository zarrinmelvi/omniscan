import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AppDatePicker from './AppDatePicker.vue'

const IonDatetime = defineComponent({
	name: 'IonDatetime',
	props: ['value', 'min', 'max', 'presentation'],
	setup(props) {
		return () => h('div', { class: 'stub-datetime', 'data-min': props.min, 'data-max': props.max })
	},
})
const IonModal = defineComponent({
	name: 'IonModal',
	props: ['isOpen'],
	setup(props, { slots }) {
		return () => (props.isOpen ? h('div', { class: 'stub-modal' }, slots.default?.()) : null)
	},
})

function factory(props: Record<string, unknown>) {
	return mount(AppDatePicker, {
		props,
		global: { stubs: { IonDatetime, IonModal } },
	})
}

describe('AppDatePicker', () => {
	it('passes min and max to ion-datetime', async () => {
		const w = factory({ modelValue: '', min: '1900-01-01', max: '2020-01-01' })
		await w.find('.app-date-picker__trigger').trigger('click')
		const dt = w.findComponent(IonDatetime)
		expect(dt.props('min')).toBe('1900-01-01')
		expect(dt.props('max')).toBe('2020-01-01')
	})

	it('emits ISO value on Done', async () => {
		const w = factory({ modelValue: '', min: '1900-01-01', max: '2020-01-01' })
		await w.find('.app-date-picker__trigger').trigger('click')
		w.findComponent(IonDatetime).vm.$emit('ionChange', { detail: { value: '1999-05-17T00:00:00' } })
		await w.find('[data-test="done"]').trigger('click')
		expect(w.emitted('update:modelValue')?.[0]).toEqual(['1999-05-17'])
		expect(w.emitted('change')?.[0]).toEqual(['1999-05-17'])
	})

	it('does not emit on Cancel and ignores malformed values', async () => {
		const w = factory({ modelValue: '0001-01-31', min: '1900-01-01', max: '2020-01-01' })
		expect(w.find('.app-date-picker--empty').exists()).toBe(true)
		await w.find('.app-date-picker__trigger').trigger('click')
		await w.find('[data-test="cancel"]').trigger('click')
		expect(w.emitted('update:modelValue')).toBeUndefined()
	})

	it('keeps an existing out-of-range value when opened and Done is pressed', async () => {
		const w = factory({ modelValue: '2020-01-01', min: '2030-01-01', max: '2040-01-01' })
		await w.find('.app-date-picker__trigger').trigger('click')
		await w.find('[data-test="done"]').trigger('click')
		expect(w.emitted('update:modelValue')).toBeUndefined()
		expect(w.emitted('change')).toBeUndefined()
	})

	it('clamps a newly chosen date to min on confirm', async () => {
		const w = factory({ modelValue: '', min: '2030-01-01', max: '2040-01-01' })
		await w.find('.app-date-picker__trigger').trigger('click')
		w.findComponent(IonDatetime).vm.$emit('ionChange', { detail: { value: '2020-05-05' } })
		await w.find('[data-test="done"]').trigger('click')
		expect(w.emitted('update:modelValue')?.[0]).toEqual(['2030-01-01'])
	})

	it('does not open when disabled', async () => {
		const w = factory({ modelValue: '', disabled: true })
		await w.find('.app-date-picker__trigger').trigger('click')
		expect(w.find('.stub-modal').exists()).toBe(false)
	})
})
