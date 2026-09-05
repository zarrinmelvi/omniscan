<template>
	<ion-page>
		<ion-content :fullscreen="true" class="welcome-content">
			<div class="welcome-bg">
				<div class="welcome-overlay"></div>

				<div class="welcome-body">
					<span class="brand-label">OmniScan</span>

					<h1 class="headline">Scan with Confidence.<br />Live with Intention.</h1>

					<p class="subtext">Allergen &amp; Halal detection, smart pantry, and AI recommendations — all in one scan.</p>

					<div class="actions">
						<ion-button expand="block" class="get-started-btn" @click="goToRegister"> Get Started </ion-button>
						<ion-button expand="block" fill="outline" class="sign-in-btn" @click="goToLogin"> Sign In </ion-button>
					</div>

					<p class="legal-text">
						By continuing you agree to OmniScan's
						<!-- No Terms/Privacy routes exist yet — point these at real pages once they do. -->
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

	/* TODO: replace with your own asset, e.g. background-image: url('@/assets/welcome-bg.jpg'); */
	background-image:
		linear-gradient(180deg, rgba(16, 19, 15, 0.2) 0%, rgba(16, 19, 15, 0.55) 55%, rgba(10, 12, 9, 0.96) 100%),
		linear-gradient(135deg, #2f3b28 0%, #1c2418 100%);
	background-size: cover;
	background-position: center;
}

.welcome-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, transparent 0%, rgba(8, 10, 7, 0.9) 100%);
	pointer-events: none;
}

.welcome-body {
	position: relative;
	z-index: 1;
	padding: 0 24px calc(28px + env(safe-area-inset-bottom, 0px));
}

.brand-label {
	display: inline-block;
	color: #22c55e;
	font-weight: 700;
	font-size: 0.95rem;
	margin-bottom: 12px;
}

.headline {
	color: #ffffff;
	font-size: 2.2rem;
	font-weight: 800;
	line-height: 1.15;
	margin: 0 0 12px;
}

.subtext {
	color: #d1d5db;
	font-size: 0.95rem;
	line-height: 1.5;
	margin: 0 0 24px;
	max-width: 340px;
}

.actions {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-bottom: 16px;
}
.get-started-btn {
	--background: #22c55e;
	--background-activated: #16a34a;
	--border-radius: 999px;
	--box-shadow: none;
	font-weight: 700;
	height: 52px;
}
.sign-in-btn {
	--border-color: rgba(255, 255, 255, 0.5);
	--border-radius: 999px;
	--color: #ffffff;
	font-weight: 700;
	height: 52px;
}

.legal-text {
	color: #9ca3af;
	font-size: 0.75rem;
	line-height: 1.5;
	text-align: center;
	margin: 0;
}
.legal-text a {
	color: #d1d5db;
	text-decoration: underline;
}
</style>
