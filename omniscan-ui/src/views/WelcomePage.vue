<template>
	<ion-page>
		<ion-content :fullscreen="true" class="welcome-content">
			<!-- Header -->
			<header>
				<div class="brand">OmniScan</div>
				<nav class="actions" aria-label="Account">
					<button class="theme" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" :aria-pressed="isDark" @click="toggleTheme">
						<!-- Moon icon shows in LIGHT mode; Sun icon shows in DARK mode -->
						<ion-icon :icon="isDark ? sunnyOutline : moonOutline" />
					</button>
					<ion-button class="pill" @click="goToRegister">Sign up</ion-button>
					<ion-button class="pill secondary" @click="goToLogin">Sign in</ion-button>
				</nav>
			</header>

			<!-- Hero Section -->
			<main>
				<section class="hero" aria-label="Grocery store food products background">
					<div class="eyebrow">Your everyday food companion</div>
					<h1>Know your food.<br />Simplify your day.</h1>
					<p>Scan food labels, understand your ingredients, and keep your pantry organized. One smarter routine, on your browser and in your pocket.</p>
					<ion-button class="pill cta-btn" @click="goToRegister">Get started</ion-button>
					<button class="download" @click="openDownloadModal">Download the mobile app</button>
					<p class="small">One account. Your phone. Your browser.</p>
				</section>

				<div class="wrap">
					<!-- Dashboard Preview Section -->
					<section class="dashboard" aria-labelledby="dashboard-title">
						<h2 id="dashboard-title">Your kitchen, connected.</h2>
						<p>A clear view of your pantry, expiration reminders, and recipes inspired by what you already have.</p>
						<img src="/assets/dashboard.webp" alt="OmniScan dashboard preview showing pantry items, expiring food, and recent activities" width="728" height="339" />
					</section>

					<!-- Features Section -->
					<section class="features" aria-label="OmniScan features">
						<article class="card">
							<div class="eyebrow">01 / SCAN</div>
							<h3>Read beyond the label.</h3>
							<p>Capture a product label with your phone or upload a photo. Explore ingredients and potential allergen or Halal-related concerns matched to your dietary profile.</p>
						</article>
						<article class="card">
							<div class="eyebrow">02 / PANTRY</div>
							<h3>Less forgotten food.</h3>
							<p>Organize food by fridge, freezer, or cupboard. Record quantities and dates, receive expiration reminders, and archive consumed items.</p>
						</article>
						<article class="card">
							<div class="eyebrow">03 / RECIPES</div>
							<h3>Cook with what you have.</h3>
							<p>Discover recipe suggestions based on your pantry and dietary preferences. Save favorites and keep a made-recipe history.</p>
						</article>
					</section>

					<!-- Mobile App Section -->
					<section class="mobile" id="mobile">
						<div class="eyebrow">POCKET-SIZED. DESKTOP-READY.</div>
						<h2>A little scan. A smarter routine.</h2>
						<p>Take your pantry with you. Scan on the go, review your food, and plan your next meal from the OmniScan mobile app.</p>
						<img class="phone" src="/assets/phone.webp" alt="OmniScan mobile app preview with pantry status and recipe suggestions" width="220" height="438" loading="lazy" />
					</section>

					<!-- Dietary Section -->
					<section class="diet">
						<h2>Built around your dietary needs.</h2>
						<p>Set allergen sensitivities and Halal preferences in your profile. Review dietary alerts, customize reminders, and manage your display preferences.</p>
						<p class="small">OmniScan is a decision-support tool, not a guarantee of allergen safety or Halal certification. Always verify packaging, ingredients, and certification with trusted sources before consumption.</p>
					</section>

					<!-- Footer -->
					<footer>
						<span class="brand" style="font-size: 18px">OmniScan</span>
						<span>Your everyday food companion.</span>
					</footer>
				</div>
			</main>

			<!-- Download Modal -->
			<ion-modal :is-open="isDownloadModalOpen" @didDismiss="isDownloadModalOpen = false" class="download-modal">
				<div class="modal-dialog">
					<button class="close" aria-label="Close dialog" @click="isDownloadModalOpen = false">×</button>
					<h2>Download the mobile app</h2>
					<p>The Android app download will be available here once the OmniScan APK is connected.</p>
					<ion-button class="pill" @click="isDownloadModalOpen = false" style="margin-top: 16px">Got it</ion-button>
				</div>
			</ion-modal>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonButton, IonIcon, IonModal } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { moonOutline, sunnyOutline } from 'ionicons/icons'
import { useDarkMode } from '@/composables/useDarkMode'

const router = useRouter()
const { isDark, toggle } = useDarkMode()
const isDownloadModalOpen = ref(false)

function goToRegister() {
	router.push('/register')
}

function goToLogin() {
	router.push('/login')
}

function toggleTheme() {
	toggle()
}

function openDownloadModal() {
	isDownloadModalOpen.value = true
}
</script>

<style scoped>
/* Base Styles */
* {
	box-sizing: border-box;
	-webkit-tap-highlight-color: transparent;
}

.welcome-content {
	--background: #f4f9f5;
	--color: #12291b;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Force dark background directly on ion-content element and web component part */
:global(html.ion-palette-dark) .welcome-content,
:global(body.dark) .welcome-content,
:global(html.ion-palette-dark) .welcome-content {
	--background: #09130e !important;
	--color: #eef4ed !important;
	background: #09130e !important;
}

.welcome-content::part(scroll) {
	overflow-x: hidden;
}

:global(html.ion-palette-dark) .welcome-content::part(scroll),
:global(body.dark) .welcome-content::part(scroll) {
	background: #09130e !important;
}

ion-button {
	text-transform: none;
	font-weight: 600;
	--box-shadow: none;
	-webkit-tap-highlight-color: transparent;
}

/* Header */
header {
	position: relative;
	z-index: 10;
	max-width: 1200px;
	margin: 0 auto;
	height: 76px;
	padding: 0 32px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: transparent;
}

.brand {
	font-size: 24px;
	font-weight: 800;
	color: #278846;
	letter-spacing: -0.5px;
}

:global(html.ion-palette-dark) .brand,
:global(body.dark) .brand {
	color: #63cd77 !important;
}

.actions {
	display: flex;
	gap: 12px;
	align-items: center;
}

/* Theme Toggle */
.theme {
	width: 38px;
	height: 38px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	border-radius: 50%;
	background: #f1f5f9;
	color: #334155;
	font-size: 1.15rem;
	cursor: pointer;
	transition: background 0.2s ease, color 0.2s ease;
	-webkit-tap-highlight-color: transparent;
}

.theme:hover {
	background: #e2e8f0;
}

.theme ion-icon {
	font-size: 1.15rem;
	color: #334155 !important;
}

:global(html.ion-palette-dark) .theme,
:global(body.dark) .theme {
	background: #334155 !important;
}

:global(html.ion-palette-dark) .theme ion-icon,
:global(body.dark) .theme ion-icon {
	color: #fbbf24 !important;
}

:global(html.ion-palette-dark) header,
:global(body.dark) header {
	background: rgba(9, 19, 14, 0.92) !important;
	backdrop-filter: blur(8px);
}

/* Pill Buttons */
ion-button.pill {
	background: transparent !important;
	--border-radius: 30px;
	--background: #34a853 !important;
	--background-hover: #2d9248 !important;
	--background-activated: #2d9248 !important;
	--color: #ffffff !important;
	--padding-start: 22px;
	--padding-end: 22px;
	--padding-top: 10px;
	--padding-bottom: 10px;
	font-size: 13px;
	height: auto;
	margin: 0;
	opacity: 1 !important;
	-webkit-tap-highlight-color: transparent;
}

ion-button.pill.secondary {
	background: transparent !important;
	--background: #e8f5ec !important;
	--background-hover: #d6ebd9 !important;
	--background-activated: #d6ebd9 !important;
	--color: #1f5e34 !important;
	opacity: 1 !important;
}

ion-button.pill.cta-btn {
	display: block;
	width: fit-content;
	margin: 16px auto 0;
}

:global(html.ion-palette-dark) ion-button.pill,
:global(body.dark) ion-button.pill {
	background: transparent !important;
	--background: #34a853 !important;
	--color: #ffffff !important;
}

:global(html.ion-palette-dark) ion-button.pill.secondary,
:global(body.dark) ion-button.pill.secondary {
	background: transparent !important;
	--background: #e8f5ec !important;
	--color: #1f5e34 !important;
}

/* Hero Section */
.hero {
	position: relative;
	text-align: center;
	padding: 54px 20px 140px;
	isolation: isolate;
	overflow: hidden;
}

.hero::before {
	content: '';
	position: absolute;
	inset: -76px 0 0;
	z-index: -2;
	background: url('/assets/hero.webp') center/cover no-repeat;
	opacity: 0.18;
	filter: blur(2px);
}

:global(html.ion-palette-dark) .hero::before,
:global(body.dark) .hero::before {
	opacity: 0.12 !important;
}

.hero::after {
	content: '';
	position: absolute;
	inset: 0;
	z-index: -1;
	background: linear-gradient(180deg, rgba(244, 249, 245, 0.4) 0%, rgba(244, 249, 245, 0.85) 60%, #f4f9f5 100%);
}

:global(html.ion-palette-dark) .hero::after,
:global(body.dark) .hero::after {
	background: linear-gradient(180deg, rgba(9, 19, 14, 0.7) 0%, rgba(9, 19, 14, 0.92) 60%, #09130e 100%) !important;
}

.eyebrow {
	font-size: 11px;
	color: #278846;
	text-transform: uppercase;
	font-weight: 700;
	letter-spacing: 0.8px;
}

h1 {
	font-size: clamp(38px, 5.5vw, 62px);
	line-height: 1.05;
	letter-spacing: -2px;
	color: #0f2417;
	font-weight: 800;
	margin: 20px 0;
}

:global(html.ion-palette-dark) h1,
:global(body.dark) h1 {
	color: #eef4ed !important;
}

h2,
h3 {
	line-height: 1.2;
	letter-spacing: -0.8px;
	color: #0f2417;
}

:global(html.ion-palette-dark) h2,
:global(html.ion-palette-dark) h3,
:global(body.dark) h2,
:global(body.dark) h3 {
	color: #eef4ed !important;
}

h2 {
	font-size: 28px;
	margin: 0 0 12px;
	font-weight: 700;
}

p {
	color: #3d5946;
	margin: 0;
}

:global(html.ion-palette-dark) p,
:global(body.dark) p {
	color: #b8c8bc !important;
}

.hero p {
	max-width: 580px;
	margin: 20px auto;
	font-size: 15px;
	color: #334d3b;
}

:global(html.ion-palette-dark) .hero p,
:global(body.dark) .hero p {
	color: #b8c8bc !important;
}

.download {
	display: block;
	width: fit-content;
	margin: 16px auto;
	color: #278846;
	text-decoration: none;
	font-size: 13px;
	font-weight: 600;
	background: none;
	border: 0;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
}

.download:hover {
	text-decoration: underline;
}

:global(html.ion-palette-dark) .download,
:global(body.dark) .download {
	color: #63cd77 !important;
}

.small {
	font-size: 12px;
	color: #627d6b;
}

.hero .small {
	margin: 16px auto 0;
}

/* Layout & Cards */
.wrap {
	max-width: 1120px;
	margin: auto;
	padding: 0 26px;
}

.dashboard {
	position: relative;
	margin-top: -85px;
	background: #d8eadc;
	border-radius: 20px;
	padding: 32px;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
}

:global(html.ion-palette-dark) .dashboard,
:global(body.dark) .dashboard {
	background: #0d1f13 !important;
	border: 1px solid #1a3322 !important;
}

.dashboard p {
	margin: 0 0 24px;
}

.dashboard img {
	display: block;
	width: 100%;
	height: auto;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.features {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 24px;
	margin-top: 28px;
}

.card {
	background: #ffffff;
	padding: 32px;
	border-radius: 20px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
	border: 1px solid #e2efe5;
}

:global(html.ion-palette-dark) .card,
:global(body.dark) .card {
	background: #0d1f13 !important;
	border: 1px solid #1a3322 !important;
}

.card h3 {
	font-size: 25px;
	margin: 16px 0 12px;
	font-weight: 700;
}

.card p {
	color: #486652;
	line-height: 1.6;
}

:global(html.ion-palette-dark) .card p,
:global(body.dark) .card p {
	color: #b8c8bc !important;
}

/* Mobile Preview Section */
.mobile {
	text-align: center;
	padding: 90px 20px 70px;
}

.mobile h2 {
	margin-top: 14px;
	font-size: 32px;
	font-weight: 700;
}

.mobile p {
	max-width: 530px;
	margin: 16px auto 36px;
}

.phone {
	width: 220px;
	display: block;
	margin: 0 auto;
	border-radius: 28px;
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
}

/* Dietary Section & Footer */
.diet {
	padding: 20px 0 60px;
}

.diet h2 {
	font-size: 28px;
	font-weight: 700;
}

.diet p {
	margin: 14px 0;
	max-width: 860px;
	color: #486652;
}

:global(html.ion-palette-dark) .diet p,
:global(body.dark) .diet p {
	color: #b8c8bc !important;
}

footer {
	border-top: 1px solid #d4e5d8;
	padding: 28px 0;
	color: #627d6b;
	display: flex;
	justify-content: space-between;
	font-size: 13px;
}

:global(html.ion-palette-dark) footer,
:global(body.dark) footer {
	border-top-color: #1a3322 !important;
	color: #8ca899 !important;
}

/* Mobile Responsive */
@media (max-width: 650px) {
	header {
		height: 64px;
		padding: 0 18px;
	}

	.brand {
		font-size: 20px;
	}

	.actions {
		gap: 8px;
	}

	ion-button.pill {
		--padding-start: 14px;
		--padding-end: 14px;
		--padding-top: 8px;
		--padding-bottom: 8px;
		font-size: 12px;
	}

	.hero {
		padding: 40px 18px 100px;
	}

	h1 {
		font-size: 38px;
	}

	.wrap {
		padding: 0 18px;
	}

	.dashboard {
		margin-top: -60px;
		padding: 20px;
	}

	.features {
		grid-template-columns: 1fr;
		gap: 16px;
	}

	.phone {
		width: 190px;
	}

	footer {
		flex-direction: column;
		gap: 8px;
	}
}
</style>

<!-- Global CSS for Modal -->
<style>
ion-modal.download-modal {
	--height: auto;
	--width: min(420px, 90vw);
	--border-radius: 20px;
	--background: transparent;
	--box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
}

.modal-dialog {
	background: #ffffff;
	border: 1px solid #c8decb;
	border-radius: 20px;
	padding: 30px;
	color: #12291b;
}

:global(html.ion-palette-dark) .modal-dialog,
:global(body.dark) .modal-dialog,
:global(html.ion-palette-dark) .modal-dialog {
	background: #0d1f13 !important;
	border: 1px solid #1a3322 !important;
	color: #eef4ed !important;
}

.modal-dialog .close {
	float: right;
	background: none;
	border: 0;
	color: inherit;
	font-size: 24px;
	cursor: pointer;
	line-height: 1;
	padding: 0;
	margin: -5px -5px 0 0;
	-webkit-tap-highlight-color: transparent;
}

.modal-dialog h2 {
	font-size: 22px;
	margin: 0 0 12px;
	clear: both;
}

.modal-dialog p {
	font-size: 14px;
	line-height: 1.5;
	margin: 0;
}
</style>