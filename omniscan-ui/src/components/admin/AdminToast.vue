<template>
	<Teleport to="body">
		<Transition name="admin-toast-fade">
			<div
				v-if="adminToastState.visible"
				class="admin-toast"
				:class="`admin-toast--${adminToastState.tone}`"
				role="status"
				aria-live="polite"
			>
				<span class="admin-toast-msg">{{ adminToastState.message }}</span>
				<button type="button" class="admin-toast-close" aria-label="Dismiss notification" @click="hideAdminToast">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { adminToastState, hideAdminToast } from '@/composables/useAdminToast'
</script>

<style scoped>
.admin-toast {
	position: fixed;
	top: 24px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: 12px;
	max-width: min(92vw, 520px);
	background: #111827;
	color: #ffffff;
	padding: 12px 14px 12px 22px;
	border-radius: 9999px;
	font-size: 0.875rem;
	font-weight: 500;
	z-index: 10000;
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
.admin-toast--warning {
	border: 1px solid #fcd34d;
}
.admin-toast-msg { line-height: 1.35; }
.admin-toast-close {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border: none;
	border-radius: 50%;
	background: transparent;
	color: inherit;
	cursor: pointer;
}
.admin-toast-close:hover { background: rgba(255, 255, 255, 0.15); }

:global(html.ion-palette-dark) .admin-toast {
	background: var(--dm-bg-card);
	color: var(--dm-text-primary);
	border: 1px solid var(--dm-border);
}
:global(html.ion-palette-dark) .admin-toast--warning { border-color: #fcd34d; }

.admin-toast-fade-enter-active, .admin-toast-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.admin-toast-fade-enter-from, .admin-toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }
</style>
