<template>
	<nav class="desktop-nav">
		<div class="nav-header">
			<h1 class="nav-title">OmniScan</h1>
		</div>
		<ul class="nav-menu">
			<li v-for="item in navItems" :key="item.path">
				<router-link :to="item.path" class="nav-item" active-class="nav-item--active">
					<ion-icon :icon="item.icon" />
					<span>{{ item.label }}</span>
				</router-link>
			</li>
		</ul>
	</nav>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import {
	homeOutline,
	cubeOutline,
	cloudUploadOutline,
	restaurantOutline,
	personOutline,
} from 'ionicons/icons'

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
	position: fixed;
	left: 0;
	top: 0;
	bottom: 0;
	width: 260px;
	background: var(--ion-background-color, #ffffff);
	border-right: 1px solid var(--ion-border-color, #e5e7eb);
	padding: 24px 0;
	overflow-y: auto;
	z-index: 1000;
}

.nav-header {
	padding: 0 24px 24px;
	border-bottom: 1px solid var(--ion-border-color, #e5e7eb);
}

.nav-title {
	font-size: 20px;
	font-weight: 700;
	color: #05c450;
	margin: 0;
}

.nav-menu {
	list-style: none;
	padding: 16px 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 11px 14px;
	margin: 0 12px;
	border-radius: 12px;
	color: #374151;
	text-decoration: none;
	transition: background 0.2s, color 0.2s;
	min-height: 44px;
}

.nav-item ion-icon {
	font-size: 22px;
	color: #374151;
}

/* Inactive nav item hover state (Light Mode) */
.nav-item:hover:not(.nav-item--active) {
	background: #f0fdf4;
	color: #15803d;
}

.nav-item:hover:not(.nav-item--active) ion-icon {
	color: #15803d;
}

/* Active nav item state (Light Mode) - locked solid green */
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
</style>