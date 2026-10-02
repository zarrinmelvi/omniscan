<template>
	<Teleport to="body">
		<div v-if="open" class="confirm-discard-overlay" @click.self="emit('keep')">
			<div class="confirm-discard-modal" role="alertdialog" aria-modal="true" :aria-label="title">
				<div class="confirm-discard-header">
					<div class="confirm-discard-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
							<line x1="12" y1="9" x2="12" y2="13"></line>
							<line x1="12" y1="17" x2="12.01" y2="17"></line>
						</svg>
					</div>
					<h2 class="confirm-discard-title">{{ title }}</h2>
				</div>

				<p class="confirm-discard-message">{{ message }}</p>

				<div class="confirm-discard-footer">
					<button class="btn-keep" type="button" @click="emit('keep')">Keep Editing</button>
					<button class="btn-discard" type="button" @click="emit('discard')">{{ discardLabel }}</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(
	defineProps<{
		open: boolean
		discardLabel: string
		title?: string
		message?: string
	}>(),
	{
		title: 'Unsaved Changes',
		message: 'You have unsaved changes. If you leave now, they will be lost.',
	},
)

const emit = defineEmits<{
	(e: 'keep'): void
	(e: 'discard'): void
}>()

// Escape acts as the safe default (Keep Editing) so an accidental key press
// never discards work.
function onKeydown(e: KeyboardEvent): void {
	if (e.key === 'Escape' && props.open) {
		e.preventDefault()
		emit('keep')
	}
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.confirm-discard-overlay {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
	padding: 24px;
}

.confirm-discard-modal {
	background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
	width: 100%;
	max-width: 420px;
	padding: 24px;
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.confirm-discard-header {
	display: flex;
	align-items: center;
	gap: 12px;
}

.confirm-discard-icon {
	width: 40px;
	height: 40px;
	border-radius: 10px;
	background: #fef3c7;
	color: #d97706;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.confirm-discard-title {
	font-size: 1.05rem;
	font-weight: 700;
	margin: 0;
	color: #0f172a;
}

.confirm-discard-message {
	margin: 0;
	font-size: 0.9rem;
	line-height: 1.5;
	color: #475569;
}

.confirm-discard-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 6px;
}

.btn-keep {
	background: #008744;
	color: #ffffff;
	border: none;
	padding: 9px 20px;
	border-radius: 8px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.btn-keep:hover {
	background: #00753a;
}

.btn-discard {
	background: #ffffff;
	border: 1px solid #fecaca;
	color: #dc2626;
	padding: 9px 18px;
	border-radius: 8px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.btn-discard:hover {
	background: #fef2f2;
}
</style>
