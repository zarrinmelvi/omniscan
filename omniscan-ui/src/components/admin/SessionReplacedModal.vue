<template>
	<Teleport to="body">
		<div v-if="open" class="session-replaced-overlay">
			<div class="session-replaced-modal" role="alertdialog" aria-modal="true" aria-labelledby="session-replaced-title" aria-describedby="session-replaced-message">
				<div class="session-replaced-header">
					<div class="session-replaced-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
							<polyline points="16 17 21 12 16 7"></polyline>
							<line x1="21" y1="12" x2="9" y2="12"></line>
						</svg>
					</div>
					<h2 id="session-replaced-title" class="session-replaced-title">Signed out</h2>
				</div>

				<p id="session-replaced-message" class="session-replaced-message">Your admin account was signed in on another device, so you've been signed out here.</p>

				<div class="session-replaced-footer">
					<button ref="okButton" class="btn-session-ok" type="button" @click="emit('confirm')">OK</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
	open: boolean
}>()

const emit = defineEmits<{
	(e: 'confirm'): void
}>()

const okButton = ref<HTMLButtonElement | null>(null)

watch(
	() => props.open,
	async (isOpen) => {
		if (isOpen) {
			await nextTick()
			okButton.value?.focus()
		}
	},
)
</script>

<style scoped>
.session-replaced-overlay {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
	padding: 24px;
}

.session-replaced-modal {
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

.session-replaced-header {
	display: flex;
	align-items: center;
	gap: 12px;
}

.session-replaced-icon {
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

.session-replaced-title {
	font-size: 1.05rem;
	font-weight: 700;
	margin: 0;
	color: #0f172a;
}

.session-replaced-message {
	margin: 0;
	font-size: 0.9rem;
	line-height: 1.5;
	color: #475569;
}

.session-replaced-footer {
	display: flex;
	justify-content: flex-end;
	margin-top: 6px;
}

.btn-session-ok {
	background: #008744;
	border: none;
	color: #ffffff;
	padding: 9px 24px;
	border-radius: 8px;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.12s;
}
.btn-session-ok:hover {
	background: #00753a;
}

:global(html.ion-palette-dark) .session-replaced-modal {
	background: var(--dm-bg-card);
	border: 1px solid var(--dm-border);
}
:global(html.ion-palette-dark) .session-replaced-icon {
	background: var(--dm-bg-chip);
	color: var(--dm-text-secondary);
}
:global(html.ion-palette-dark) .session-replaced-title {
	color: var(--dm-text-primary);
}
:global(html.ion-palette-dark) .session-replaced-message {
	color: var(--dm-text-secondary);
}
</style>
