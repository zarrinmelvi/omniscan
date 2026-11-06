<template>
	<nav class="desktop-nav">
		<!-- Brand header -->
		<div class="nav-brand">
			<span class="nav-brand__name">OmniScan</span>
		</div>

		<!-- Navigation items -->
		<ul class="nav-menu">
			<li v-for="item in navItems" :key="item.path">
				<router-link :to="item.path" class="nav-item" active-class="nav-item--active">
					<ion-icon :icon="item.icon" />
					<span>{{ item.label }}</span>
				</router-link>
			</li>
		</ul>

		<!-- User identity footer -->
		<div class="nav-footer">
			<button type="button" class="nav-footer__user-btn" @click="goToProfile">
				<div class="nav-footer__user">
					<div class="nav-footer__avatar">
						<img v-if="userAvatarBase64" :src="userAvatarBase64" alt="Avatar" class="nav-footer__avatar-img" />
						<span v-else class="nav-footer__avatar-initial">{{ (userName || '?').charAt(0).toUpperCase() }}</span>
					</div>
					<div class="nav-footer__info">
						<span class="nav-footer__name">{{ userName || 'User' }}</span>
						<span class="nav-footer__email">{{ userEmail || '' }}</span>
					</div>
				</div>
			</button>
			<button type="button" class="nav-footer__logout" @click="showLogoutConfirm = true">Log Out</button>
		</div>

		<!-- Logout confirmation overlay -->
		<div v-if="showLogoutConfirm" class="logout-confirm-overlay" @click.self="showLogoutConfirm = false">
			<div class="logout-confirm-modal">
				<p class="logout-confirm-title">Log Out</p>
				<p class="logout-confirm-msg">Are you sure you want to log out?</p>
				<div class="logout-confirm-actions">
					<button type="button" class="logout-btn-cancel" @click="showLogoutConfirm = false">Cancel</button>
					<button type="button" class="logout-btn-confirm" @click="confirmLogout">Log Out</button>
				</div>
			</div>
		</div>
	</nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import {
	homeOutline,
	cubeOutline,
	cloudUploadOutline,
	restaurantOutline,
	personOutline,
} from 'ionicons/icons'
import { useAuthStore } from '@/stores/authStore'

defineProps<{
	userName?: string
	userEmail?: string
	userAvatarBase64?: string | null
}>()

const authStore = useAuthStore()
const router = useRouter()
const showLogoutConfirm = ref(false)

async function confirmLogout(): Promise<void> {
	try {
		await authStore.logout()
	} catch {
		/* ignore */
	}
	window.location.href = 'https://omniscan.website'
}

function goToProfile(): void {
	router.push('/tabs/profile')
}

const navItems = [
	{ path: '/tabs/home', label: 'Home', icon: homeOutline },
	{ path: '/tabs/pantry', label: 'Pantry', icon: cubeOutline },
	{ path: '/tabs/scan', label: 'Upload', icon: cloudUploadOutline },
	{ path: '/tabs/recipes', label: 'Recipes', icon: restaurantOutline },
	{ path: '/tabs/profile', label: 'Profile', icon: personOutline },
]
</script>

<style scoped>
.desktop-nav {
	width: 220px;
	height: 100vh;
	background: var(--ion-background-color, #ffffff);
	border-right: 1px solid var(--ion-border-color, #e5e7eb);
	padding: 0;
	overflow-y: auto;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
}

/* ── Brand header ── */
.nav-brand {
	padding: 20px 20px 16px;
	border-bottom: 1px solid var(--ion-border-color, #e5e7eb);
	flex-shrink: 0;
}

.nav-brand__name {
	display: block;
	font-size: 1.3rem;
	font-weight: 800;
	color: #05c450;
	letter-spacing: -0.02em;
}

/* ── Nav menu ── */
.nav-menu {
	list-style: none;
	padding: 16px 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
	overflow-y: auto;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 14px;
	margin: 0 12px;
	border-radius: 12px;
	color: #374151;
	text-decoration: none;
	transition: background 0.2s, color 0.2s;
	min-height: 44px;
	font-size: 0.9rem;
	font-weight: 500;
}

.nav-item ion-icon {
	font-size: 20px;
	color: #4b5563;
	flex-shrink: 0;
}

/* Inactive nav item hover state */
.nav-item:hover:not(.nav-item--active) {
	background: #f0fdf4;
	color: #15803d;
}

.nav-item:hover:not(.nav-item--active) ion-icon {
	color: #15803d;
}

/* Active nav item state - locked solid green */
.nav-item--active,
.nav-item--active:hover {
	background: #00b050 !important;
	color: #ffffff !important;
	font-weight: 700 !important;
	cursor: default;
}

.nav-item--active ion-icon,
.nav-item--active:hover ion-icon {
	color: #ffffff !important;
}

/* ── User identity footer ── */
.nav-footer {
	padding: 12px 14px 14px;
	border-top: 1px solid var(--ion-border-color, #e5e7eb);
	flex-shrink: 0;
}

.nav-footer__user {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	min-width: 0;
}

.nav-footer__avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: #05c450;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	overflow: hidden;
}

.nav-footer__avatar-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.nav-footer__avatar-initial {
	color: #ffffff;
	font-size: 0.9rem;
	font-weight: 700;
}

.nav-footer__info {
	min-width: 0;
	flex: 1;
}

.nav-footer__name {
	display: block;
	font-size: 0.82rem;
	font-weight: 700;
	color: #111827;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.nav-footer__email {
	display: block;
	font-size: 0.72rem;
	color: #9ca3af;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.nav-footer__logout {
	display: block;
	width: 100%;
	background: none;
	border: none;
	color: #dc2626;
	font-size: 0.82rem;
	font-weight: 600;
	padding: 7px 8px;
	cursor: pointer;
	text-align: left;
	border-radius: 8px;
	transition: background 0.15s, color 0.15s;
}

.nav-footer__logout:hover {
	background: rgba(220, 38, 38, 0.08);
	color: #b91c1c;
}

/* User row as clickable button */
.nav-footer__user-btn {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	background: none;
	border: none;
	padding: 6px 8px;
	margin-bottom: 4px;
	cursor: pointer;
	border-radius: 8px;
	transition: background 0.15s;
	text-align: left;
}
.nav-footer__user-btn:hover {
	background: rgba(0, 0, 0, 0.05);
}

/* Logout confirmation overlay */
.logout-confirm-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}
.logout-confirm-modal {
	background: #ffffff;
	border-radius: 20px;
	padding: 28px 28px 22px;
	width: 340px;
	max-width: calc(100vw - 48px);
	box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
}
.logout-confirm-title {
	font-size: 1.15rem;
	font-weight: 700;
	color: #111827;
	margin: 0 0 8px;
	text-align: center;
}
.logout-confirm-msg {
	font-size: 0.88rem;
	color: #6b7280;
	text-align: center;
	margin: 0 0 22px;
}
.logout-confirm-actions {
	display: flex;
	gap: 12px;
}
.logout-btn-cancel {
	flex: 1;
	height: 44px;
	border: 1.5px solid #d1d5db;
	border-radius: 9999px;
	background: transparent;
	color: #374151;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s, border-color 0.15s;
}
.logout-btn-cancel:hover {
	background: #f9fafb;
	border-color: #9ca3af;
}
.logout-btn-confirm {
	flex: 1;
	height: 44px;
	border: none;
	border-radius: 9999px;
	background: #dc2626;
	color: #ffffff;
	font-size: 0.88rem;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s;
}
.logout-btn-confirm:hover {
	background: #b91c1c;
}

:global(html.ion-palette-dark) .logout-confirm-modal {
	background: #1e293b;
}
:global(html.ion-palette-dark) .logout-confirm-title {
	color: #f9fafb;
}
:global(html.ion-palette-dark) .logout-confirm-msg {
	color: #9ca3af;
}
:global(html.ion-palette-dark) .logout-btn-cancel {
	border-color: #334155;
	color: #d1d5db;
}
:global(html.ion-palette-dark) .nav-footer__user-btn:hover {
	background: rgba(255, 255, 255, 0.06);
}
:global(html.ion-palette-dark) .nav-brand__name {
	color: #05c450;
}
:global(html.ion-palette-dark) .nav-footer__name {
	color: #f3f4f6;
}
</style>