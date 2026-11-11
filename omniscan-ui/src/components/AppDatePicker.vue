<template>
	<!-- Single root so the parent's classes and scoped styles (e.g. .custom-input) apply to the visible box. -->
	<div
		class="app-date-picker"
		:class="{ 'app-date-picker--empty': !normalizedValue, 'app-date-picker--disabled': disabled }"
	>
	<button
		type="button"
		class="app-date-picker__trigger"
		:disabled="disabled"
		:aria-label="ariaLabel || placeholder"
		aria-haspopup="dialog"
		@click="open"
	>
		<span class="app-date-picker__text">{{ displayText }}</span>
	</button>

	<ion-modal
		:is-open="isOpen"
		class="app-date-picker-modal"
		@didDismiss="isOpen = false"
	>
		<div class="app-date-picker-sheet">
			<ion-datetime
				presentation="date"
				:value="draft || undefined"
				:min="min"
				:max="max"
				@ionChange="onIonChange"
			/>
			<div class="app-date-picker-actions">
				<button type="button" class="app-date-picker-btn" data-test="cancel" @click="cancel">Cancel</button>
				<button type="button" class="app-date-picker-btn app-date-picker-btn--primary" data-test="done" @click="confirm">Done</button>
			</div>
		</div>
	</ion-modal>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IonDatetime, IonModal } from '@ionic/vue'
import { toISODate } from '@/utils/dateUtils'

const props = withDefaults(
	defineProps<{
		modelValue?: string | null
		min?: string
		max?: string
		placeholder?: string
		disabled?: boolean
		ariaLabel?: string
	}>(),
	{ modelValue: '', min: undefined, max: undefined, placeholder: 'Select date', disabled: false, ariaLabel: '' }
)

const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void
	(e: 'change', value: string): void
}>()

const isOpen = ref(false)
const draft = ref('')

const normalizedValue = computed(() => toISODate(props.modelValue))

const displayText = computed(() => {
	if (!normalizedValue.value) return props.placeholder
	const [y, m, d] = normalizedValue.value.split('-').map(Number)
	return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
})

function clamp(value: string): string {
	if (!value) return value
	if (props.min && value < props.min) return props.min
	if (props.max && value > props.max) return props.max
	return value
}

function open(): void {
	if (props.disabled) return
	// Start from the current value, otherwise from the allowed range (never year 1).
	draft.value = normalizedValue.value ? clamp(normalizedValue.value) : ''
	isOpen.value = true
}

function onIonChange(event: CustomEvent): void {
	draft.value = toISODate(event.detail?.value)
}

function cancel(): void {
	isOpen.value = false
}

function confirm(): void {
	const next = clamp(draft.value)
	isOpen.value = false
	if (!next || next === normalizedValue.value) return
	emit('update:modelValue', next)
	emit('change', next)
}
</script>

<style scoped>
.app-date-picker {
	display: flex;
	align-items: center;
	cursor: pointer;
	box-sizing: border-box;
}

.app-date-picker--disabled {
	cursor: not-allowed;
	opacity: 0.7;
}

.app-date-picker__trigger {
	flex: 1;
	width: 100%;
	min-height: 1.5em;
	padding: 0;
	margin: 0;
	border: none;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: inherit;
}

.app-date-picker--empty .app-date-picker__text {
	opacity: 0.6;
}

.app-date-picker-sheet {
	padding: 8px 8px 12px;
}

.app-date-picker-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	padding: 0 8px;
}

.app-date-picker-btn {
	border: none;
	background: transparent;
	font: inherit;
	font-weight: 600;
	padding: 10px 16px;
	border-radius: 8px;
	color: var(--ion-color-medium, #6b7280);
	cursor: pointer;
}

.app-date-picker-btn--primary {
	background: #22c55e;
	color: #fff;
}
</style>
