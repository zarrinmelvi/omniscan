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
	// Keep an existing value as-is (even if outside min/max) so just opening and pressing Done never changes it.
	// Clamping only happens when the user confirms a newly chosen date.
	draft.value = normalizedValue.value
	isOpen.value = true
}

function onIonChange(event: CustomEvent): void {
	draft.value = toISODate(event.detail?.value)
}

function cancel(): void {
	isOpen.value = false
}

function confirm(): void {
	isOpen.value = false
	// Untouched draft (e.g. an existing out-of-range value): nothing to confirm.
	if (!draft.value || draft.value === normalizedValue.value) return
	const next = clamp(draft.value)
	if (next === normalizedValue.value) return
	emit('update:modelValue', next)
	emit('change', next)
}
</script>

<style>
/* Non-scoped: ion-modal is moved to the app root overlay, so target the host directly.
   Centered floating dialog (default Ionic modal, no sheet breakpoints), also on phones. */
ion-modal.app-date-picker-modal {
	--width: min(92vw, 360px);
	--height: auto;
	--max-height: 90vh;
	--border-radius: 16px;
	--box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
	--backdrop-opacity: 0.45;
}

ion-modal.app-date-picker-modal .app-date-picker-sheet ion-datetime {
	width: 100%;
	max-width: 100%;
}

/* Theme: light (default). Brand green accent, white panel, dark text. */
ion-modal.app-date-picker-modal {
	--background: #ffffff;
	--ion-color-primary: #22c55e;
	--ion-color-primary-rgb: 34, 197, 94;
	--ion-color-primary-contrast: #ffffff;
	--ion-color-primary-contrast-rgb: 255, 255, 255;
	--ion-color-primary-shade: #1ead54;
	--ion-color-primary-tint: #38cb6f;
}

ion-modal.app-date-picker-modal ion-datetime {
	--background: #ffffff;
	--background-rgb: 255, 255, 255;
	--title-color: #0f172a;
	--ion-text-color: #0f172a;
	--ion-text-color-rgb: 15, 23, 42;
	--ion-color-primary: #22c55e;
	--ion-color-primary-rgb: 34, 197, 94;
	--ion-color-primary-contrast: #ffffff;
	--ion-color-primary-contrast-rgb: 255, 255, 255;
	--wheel-highlight-background: rgba(34, 197, 94, 0.15);
	--wheel-fade-background-rgb: 255, 255, 255;
	color: #0f172a;
}

/* Theme: dark. Navy #1e293b panel with light text; same green accent. */
html.ion-palette-dark ion-modal.app-date-picker-modal,
body.dark ion-modal.app-date-picker-modal {
	--background: #1e293b;
}

html.ion-palette-dark ion-modal.app-date-picker-modal ion-datetime,
body.dark ion-modal.app-date-picker-modal ion-datetime {
	--background: #1e293b;
	--background-rgb: 30, 41, 59;
	--title-color: #f1f5f9;
	--ion-text-color: #f1f5f9;
	--ion-text-color-rgb: 241, 245, 249;
	--ion-color-step-150: #334155;
	--ion-color-step-300: #475569;
	--ion-color-step-600: #94a3b8;
	--wheel-highlight-background: #334155;
	--wheel-fade-background-rgb: 30, 41, 59;
	color: #f1f5f9;
}

html.ion-palette-dark ion-modal.app-date-picker-modal .app-date-picker-btn:not(.app-date-picker-btn--primary),
body.dark ion-modal.app-date-picker-modal .app-date-picker-btn:not(.app-date-picker-btn--primary) {
	color: #94a3b8;
}
</style>

<style scoped>
.app-date-picker-sheet ion-datetime {
	width: 100%;
	max-width: 100%;
}

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
