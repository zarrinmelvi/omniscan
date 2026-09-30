<template>
	<nav class="desktop-nav">
		<div class="nav-header">
			<img src="/favicon.png" alt="OmniScan Logo" class="nav-logo" />
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
import { homeOutline, cameraOutline, cubeOutline, restaurantOutline } from 'ionicons/icons'

const navItems = [
	{ path: '/tabs/home', label: 'Home', icon: homeOutline },
	{ path: '/tabs/scan', label: 'Scan', icon: cameraOutline },
	{ path: '/tabs/pantry', label: 'Pantry', icon: cubeOutline },
	{ path: '/tabs/recipes', label: 'Recipes', icon: restaurantOutline },
]
</script>

<style scoped>
.desktop-nav {
	position: fixed;
	left: 0;
	top: 0;
	bottom: 0;
	width: 260px;
	background: var(--ion-background-color);
	border-right: 1px solid var(--ion-border-color);
	padding: 24px 0;
	overflow-y: auto;
	z-index: 1000;
}

.nav-header {
	padding: 0 24px 24px;
	border-bottom: 1px solid var(--ion-border-color);
}

.nav-logo {
	width: 48px;
	height: 48px;
	margin-bottom: 12px;
}

.nav-title {
	font-size: 20px;
	font-weight: 600;
	margin: 0;
}

.nav-menu {
	list-style: none;
	padding: 16px 0;
	margin: 0;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 24px;
	color: var(--ion-text-color);
	text-decoration: none;
	transition: background 0.2s;
	min-height: 44px; /* Touch target size */
}

.nav-item:hover {
	background: var(--ion-color-light);
}

.nav-item--active {
	background: var(--ion-color-primary-tint);
	color: var(--ion-color-primary);
	font-weight: 600;
}

.nav-item ion-icon {
	font-size: 24px;
}
</style>
