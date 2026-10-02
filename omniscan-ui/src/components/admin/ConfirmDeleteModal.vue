<template>
	<Teleport to="body">
		<div v-if="open" class="confirm-delete-overlay" @click.self="emit('cancel')">
			<div class="confirm-delete-modal" role="alertdialog" aria-modal="true" :aria-label="title">
				<div class="confirm-delete-header">
					<div class="confirm-delete-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="3 6 5 6 21 6"></polyline>
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
							<line x1="10" y1="11" x2="10" y2="17"></line>
							<line x1="14" y1="11" x2="14" y2="17"></line>
						</svg>
					</div>
					<h2 class="confirm-delete-title">{{ title }}</h2>
				</div>

				<p class="confirm-delete-message">{{ message }}</p>

				<div class="confirm-delete-footer">
					<button class="btn-cancel" type="button" :disabled="busy" @click="emit('cancel')">Cancel</button>
					<button class="btn-delete-confirm" type="button" :disabled="busy" @click="emit('confirm')">
						{{ busy ? 'Deleting…' : confirmLabel }}
					</button>
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
		title?: string
		message?: string
		confirmLabel?: string
		busy?: boolean
	}>(),
	{
		title: 'Delete record',
		message: 'Delete this record from the knowledge base? This cannot be undone.',
		confirmLabel: 'Delete',
		busy: false,
	},
)

const emit = defineEmits<{
	(e: 'cancel'): void
	(e: 'confirm'): void
}>()

// Escape = Cancel (safe default). Ignored while a delete is in flight.
function onKeydown(e: KeyboardEvent): void {
	if (e.key === 'Escape' && props.open && !props.busy) {
		e.preventDefault()
		emit('cancel')
	}
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.confirm-delete-overlay {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
	padding: 24px;
}

.confirm-delete-modal {
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

.confirm-delete-header {
	display: flex;
	align-items: center;
	gap: 12px;
}

.confirm-delete-icon {
	width: 40px;
	height: 40px;
	border-radius: 10px;
	background: #fef2f2;
	color: #dc2626;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.confirm-delete-title {
	font-size: 1.05rem;
	font-weight: 700;
	margin: 0;
	color: #0f172a;
}

.confirm-delete-message {
	margin: 0;
	font-size: 0.9rem;
	line-height: 1.5;
	color: #475569;
}

.confirm-delete-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 6px;
}

.btn-cancel {
	background: #ffffff;
	border: 1px solid #e2e8f0;
	color: #64748b;
	padding: 9px 18px;
	border-radius: 8px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.btn-cancel:hover:not(:disabled) {
	background: #f8fafc;
}
.btn-cancel:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-delete-confirm {
	background: #dc2626;
	border: none;
	color: #ffffff;
	padding: 9px 20px;
	border-radius: 8px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.btn-delete-confirm:hover:not(:disabled) {
	background: #b91c1c;
}
.btn-delete-confirm:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
