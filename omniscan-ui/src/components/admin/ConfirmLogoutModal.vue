<template>
	<Teleport to="body">
		<div v-if="open" class="confirm-logout-overlay" @click.self="emit('cancel')">
			<div class="confirm-logout-modal" role="alertdialog" aria-modal="true" aria-label="Sign out confirmation">
				<div class="confirm-logout-header">
					<div class="confirm-logout-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
							<polyline points="16 17 21 12 16 7"></polyline>
							<line x1="21" y1="12" x2="9" y2="12"></line>
						</svg>
					</div>
					<h2 class="confirm-logout-title">Sign out of OmniScan?</h2>
				</div>

				<p class="confirm-logout-message">You'll be returned to the login page and your admin session will end.</p>

				<div class="confirm-logout-footer">
					<button class="btn-logout-cancel" type="button" @click="emit('cancel')">Cancel</button>
					<button class="btn-logout-confirm" type="button" @click="emit('confirm')">Sign Out</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits<{
	(e: 'cancel'): void
	(e: 'confirm'): void
}>()

// Escape = Cancel (safe default).
function onKeydown(e: KeyboardEvent): void {
	if (e.key === 'Escape' && props.open) {
		e.preventDefault()
		emit('cancel')
	}
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.confirm-logout-overlay {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
	padding: 24px;
}

.confirm-logout-modal {
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

.confirm-logout-header {
	display: flex;
	align-items: center;
	gap: 12px;
}

.confirm-logout-icon {
	width: 40px;
	height: 40px;
	border-radius: 10px;
	background: #f1f5f9;
	color: #475569;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.confirm-logout-title {
	font-size: 1.05rem;
	font-weight: 700;
	margin: 0;
	color: #0f172a;
}

.confirm-logout-message {
	margin: 0;
	font-size: 0.9rem;
	line-height: 1.5;
	color: #475569;
}

.confirm-logout-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 6px;
}

.btn-logout-cancel {
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
.btn-logout-cancel:hover {
	background: #f8fafc;
}

.btn-logout-confirm {
	background: #008744;
	border: none;
	color: #ffffff;
	padding: 9px 20px;
	border-radius: 8px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.btn-logout-confirm:hover {
	background: #00753a;
}
</style>
