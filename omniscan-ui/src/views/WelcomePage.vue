<template>
	<ion-page>
		<ion-content :fullscreen="true" class="welcome-content">
			<div class="welcome-bg">
				<div class="welcome-overlay"></div>

				<div class="welcome-body">
					<span class="brand-label">OmniScan</span>

					<h1 class="headline">Scan with<br />Confidence.<br />Live with<br />Intention.</h1>

					<p class="subtext">Allergen &amp; Halal detection, smart pantry, and AI recommendations — all in one scan.</p>

					<div class="actions">
						<ion-button expand="block" class="get-started-btn" @click="goToRegister"> Get Started </ion-button>
						<ion-button expand="block" fill="outline" class="sign-in-btn" @click="goToLogin"> Sign In </ion-button>
					</div>

					<p class="legal-text">
						By continuing you agree to OmniScan's
						<!-- No Terms/Privacy routes exist yet – point these at real pages once they do. -->
						<a href="#" @click.prevent>Terms of Service</a> and <a href="#" @click.prevent>Privacy Policy</a>.
					</p>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function goToRegister() {
	router.push('/register')
}

function goToLogin() {
	router.push('/login')
}
</script>

<style scoped>
.welcome-content {
	--background: #10130f;
}

.welcome-bg {
	position: relative;
	min-height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;

	/* Replace with your background image path when ready */
	background-image:
		linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.5) 40%, rgba(0, 0, 0, 0.85) 100%),
		linear-gradient(135deg, #2f3b28 0%, #1c2418 100%);
	background-size: cover;
	background-position: center;
}

.welcome-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.75) 100%);
	pointer-events: none;
}

.welcome-body {
	position: relative;
	z-index: 1;
	padding: 0 28px calc(32px + env(safe-area-inset-bottom, 0px));
}

.brand-label {
	display: block;
	color: #10b981;
	font-weight: 600;
	font-size: 0.85rem;
	margin-bottom: 6px;
}

.headline {
	color: #ffffff;
	font-size: 2.3rem;
	font-weight: 700;
	line-height: 1.15;
	letter-spacing: -0.02em;
	margin: 0 0 14px;
}

.subtext {
	color: #d1d5db;
	font-size: 0.9rem;
	line-height: 1.4;
	margin: 0 0 28px;
	max-width: 320px;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-bottom: 20px;
}

.get-started-btn {
	--background: #05c450;
	--background-activated: #04ab45;
	--border-radius: 9999px;
	--box-shadow: none;
	--color: #ffffff;
	font-weight: 600;
	font-size: 0.95rem;
	height: 48px;
	text-transform: none;
}

.sign-in-btn {
	--border-color: rgba(255, 255, 255, 0.6);
	--border-width: 1px;
	--border-radius: 9999px;
	--color: #ffffff;
	font-weight: 600;
	font-size: 0.95rem;
	height: 48px;
	text-transform: none;
}

.legal-text {
	color: #9ca3af;
	font-size: 0.75rem;
	line-height: 1.4;
	text-align: center;
	margin: 0;
	padding: 0 8px;
}

.legal-text a {
	color: #ffffff;
	text-decoration: underline;
}
</style>