<template>
	<div class="admin-layout">
		<aside class="sidebar">
			<div class="brand">
				<div class="brand-icon">🛡️</div>
				<div class="brand-text">
					<div class="brand-name">OmniScan</div>
					<div class="brand-sub">Admin Portal</div>
				</div>
			</div>

			<nav class="nav">
				<router-link to="/admin/dashboard" class="nav-item" active-class="active">
					<span class="nav-icon">📊</span> Dashboard
				</router-link>
				<router-link to="/admin/verification" class="nav-item" active-class="active">
					<span class="nav-icon">✅</span> Verification Panel
				</router-link>
				<!-- The four below are in the proposal's Admin Module scope but
				     not built yet — kept visible for structural completeness,
				     rendered as inert (non-navigating) items rather than
				     dead links, so the sidebar matches the proposal without
				     implying a page exists that doesn't. -->
				<div class="nav-item disabled" title="Not built yet">
					<span class="nav-icon">📦</span> Manage Product Data
				</div>
				<div class="nav-item disabled" title="Not built yet">
					<span class="nav-icon">👥</span> Manage User Profiles
				</div>
				<div class="nav-item disabled" title="Not built yet">
					<span class="nav-icon">📈</span> System Logs
				</div>
				<div class="nav-item disabled" title="Not built yet">
					<span class="nav-icon">⚙️</span> Settings
				</div>
			</nav>

			<div class="sidebar-footer">
				<div class="admin-info">
					<div class="admin-avatar">{{ initials }}</div>
					<div>
						<div class="admin-name">{{ adminAuthStore.admin?.full_name ?? 'Admin' }}</div>
						<div class="admin-role">{{ adminAuthStore.admin?.role ?? '' }}</div>
					</div>
				</div>
				<button class="logout-button" @click="handleLogout">Log Out</button>
			</div>
		</aside>

		<main class="admin-main">
			<router-view />
		</main>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuthStore'

const adminAuthStore = useAdminAuthStore()
const router = useRouter()

const initials = computed(() => {
	const name = adminAuthStore.admin?.full_name ?? ''
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase() || 'A'
})

function handleLogout(): void {
	adminAuthStore.logout()
	router.push({ path: '/admin/login' })
}
</script>

<style scoped>
.admin-layout {
	display: flex;
	min-height: 100vh;
	background: #f4f5f7;
	font-family: system-ui, -apple-system, sans-serif;
}

.sidebar {
	width: 240px;
	flex-shrink: 0;
	background: white;
	border-right: 1px solid #e5e7eb;
	display: flex;
	flex-direction: column;
	padding: 20px 0;
}

.brand {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 0 20px 20px;
	border-bottom: 1px solid #e5e7eb;
}
.brand-icon {
	width: 36px;
	height: 36px;
	background: #16a34a;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.1rem;
}
.brand-name {
	font-weight: 700;
	font-size: 0.95rem;
	color: #111827;
}
.brand-sub {
	font-size: 0.75rem;
	color: #6b7280;
}

.nav {
	flex: 1;
	padding: 16px 12px;
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.nav-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 6px;
	color: #374151;
	text-decoration: none;
	font-size: 0.875rem;
	cursor: pointer;
}
.nav-item:hover:not(.disabled) {
	background: #f3f4f6;
}
.nav-item.active {
	background: #16a34a;
	color: white;
}
.nav-item.disabled {
	color: #9ca3af;
	cursor: not-allowed;
}
.nav-icon {
	font-size: 1rem;
}

.sidebar-footer {
	padding: 16px 20px 0;
	border-top: 1px solid #e5e7eb;
}
.admin-info {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 12px;
}
.admin-avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: #16a34a;
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.8rem;
	font-weight: 600;
	flex-shrink: 0;
}
.admin-name {
	font-size: 0.85rem;
	font-weight: 600;
	color: #111827;
}
.admin-role {
	font-size: 0.75rem;
	color: #6b7280;
	text-transform: capitalize;
}
.logout-button {
	width: 100%;
	padding: 8px;
	border: 1px solid #e5e7eb;
	border-radius: 6px;
	background: white;
	color: #374151;
	font-size: 0.8rem;
	cursor: pointer;
}
.logout-button:hover {
	background: #f3f4f6;
}

.admin-main {
	flex: 1;
	overflow-y: auto;
}
</style>