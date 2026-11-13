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
					<ion-button class="pill" @click="router.push('/register')">Sign up</ion-button>
					<ion-button class="pill secondary" @click="router.push('/login')">Sign in</ion-button>
				</nav>
			</header>

			<!-- Hero Section -->
			<main>
				<section class="hero" aria-label="Grocery store food products background">
					<div class="eyebrow">Your everyday food companion</div>
					<h1>Know your food.<br />Simplify your day.</h1>
					<p>Scan food labels, understand your ingredients, and keep your pantry organized. One smarter routine, on your browser and in your pocket.</p>
					<a
						:href="APK_URL"
						download="OmniScan.apk"
						target="_blank"
						rel="noopener noreferrer"
						class="download-app-link"
						aria-label="Download OmniScan App v2.2.2 for Android"
						@click="showDownloadModal = true"
					>
						<ion-icon :icon="downloadOutline" />
						Download OmniScan App v2.2.2
					</a>
					<p class="android-only">
						<ion-icon :icon="logoAndroid" />
						Application is for Android only
					</p>
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
						<a href="/help" class="footer-link" @click.prevent="router.push('/help')">Help and Support</a>
						<a href="mailto:omniscan.official@gmail.com" class="footer-link">Contact us at omniscan.official@gmail.com</a>
					</footer>
				</div>
			</main>
			<div v-if="showDownloadModal" class="dl-overlay" @click.self="showDownloadModal = false">
				<div class="dl-modal">
					<button class="dl-close" aria-label="Close" @click="showDownloadModal = false">×</button>
					<div class="dl-icon-row">
						<ion-icon :icon="downloadOutline" class="dl-icon" />
					</div>
					<h3 class="dl-title">Downloading OmniScan v2.2.2...</h3>
					<p class="dl-sub">Your download will start automatically in a few seconds.</p>
					<div class="dl-notice">
						<span class="dl-notice-icon">⚠</span>
						<div>
							<p class="dl-notice-title">Android Security Notice:</p>
							<p class="dl-notice-body">Your browser may warn you that this file <strong>"might be harmful."</strong> This is a standard automated warning for any app downloaded outside the Google Play Store. It is completely safe to click <strong>Download Anyway</strong>.</p>
						</div>
					</div>
					<p class="dl-fallback">If the download doesn't start, <a :href="APK_URL" download="OmniScan.apk" class="dl-fallback-link">click here</a>.</p>
					<ion-button class="pill dl-got-it" @click="showDownloadModal = false">Got it</ion-button>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { moonOutline, sunnyOutline, downloadOutline, logoAndroid } from 'ionicons/icons'
import { useDarkMode } from '@/composables/useDarkMode'

const router = useRouter()
const { isDark, toggle } = useDarkMode()
function toggleTheme() {
	toggle()
}

const APK_URL = '/downloads/OmniScan.apk'
const showDownloadModal = ref(false)


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
html.ion-palette-dark .welcome-content {
	--background: #0f172a !important;
	--color: #f1f5f9 !important;
	background: #0f172a !important;
}

.welcome-content::part(scroll) {
	overflow-x: hidden;
}

html.ion-palette-dark .welcome-content::part(scroll) {
	background: #0f172a !important;
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
	padding-top: env(safe-area-inset-top);
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

html.ion-palette-dark .brand {
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

html.ion-palette-dark .theme {
	background: #334155 !important;
}

html.ion-palette-dark .theme ion-icon {
	color: #fbbf24 !important;
}

html.ion-palette-dark header {
	background: rgba(15, 23, 42, 0.92) !important;
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

/* Download App Link - styled as green pill button */
.download-app-link {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	background: #34a853;
	color: #ffffff;
	text-decoration: none;
	font-weight: 600;
	font-size: 14px;
	padding: 12px 24px;
	border-radius: 30px;
	margin: 16px auto 8px;
	transition: background 0.15s ease;
	cursor: pointer;
}
.download-app-link:hover {
	background: #2d9248;
}
.download-app-link ion-icon {
	font-size: 1.1rem;
	color: #ffffff;
}
html.ion-palette-dark .download-app-link {
	background: #34a853;
	color: #ffffff;
}
html.ion-palette-dark .download-app-link:hover {
	background: #2d9248;
}

html.ion-palette-dark ion-button.pill {
	background: transparent !important;
	--background: #34a853 !important;
	--color: #ffffff !important;
}

html.ion-palette-dark ion-button.pill.secondary {
	background: transparent !important;
	--background: #334155 !important;
	--background-hover: #475569 !important;
	--background-activated: #475569 !important;
	--color: #f1f5f9 !important;
	color: #f1f5f9 !important;
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

html.ion-palette-dark .hero::before {
	opacity: 0.12 !important;
}

.hero::after {
	content: '';
	position: absolute;
	inset: 0;
	z-index: -1;
	background: linear-gradient(180deg, rgba(244, 249, 245, 0.4) 0%, rgba(244, 249, 245, 0.85) 60%, #f4f9f5 100%);
}

html.ion-palette-dark .hero::after {
	background: linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.92) 60%, #0f172a 100%) !important;
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

html.ion-palette-dark h1 {
	color: #f1f5f9 !important;
}

h2,
h3 {
	line-height: 1.2;
	letter-spacing: -0.8px;
	color: #0f2417;
}

html.ion-palette-dark h2, html.ion-palette-dark h3 {
	color: #f1f5f9 !important;
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

html.ion-palette-dark p {
	color: #94a3b8 !important;
}

.hero p {
	max-width: 580px;
	margin: 20px auto;
	font-size: 15px;
	color: #334d3b;
}

html.ion-palette-dark .hero p {
	color: #94a3b8 !important;
}

/* Android Only Text */
.android-only {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	margin: 12px auto 16px;
	font-size: 13px;
	font-weight: 500;
	color: #627d6b;
}

.android-only ion-icon {
	font-size: 18px;
	color: #34a853;
}

html.ion-palette-dark .android-only {
	color: #94a3b8 !important;
}

html.ion-palette-dark .android-only ion-icon {
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

html.ion-palette-dark .dashboard {
	background: #1e293b !important;
	border: 1px solid #334155 !important;
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

html.ion-palette-dark .card {
	background: #1e293b !important;
	border: 1px solid #334155 !important;
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

html.ion-palette-dark .card p {
	color: #94a3b8 !important;
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

html.ion-palette-dark .diet p {
	color: #94a3b8 !important;
}

footer {
	border-top: 1px solid #d4e5d8;
	padding: 28px 0;
	color: #627d6b;
	display: flex;
	justify-content: space-between;
	font-size: 13px;
}

html.ion-palette-dark footer {
	border-top-color: #334155 !important;
	color: #94a3b8 !important;
}

.footer-link {
	color: #627d6b;
	text-decoration: none;
	font-weight: 600;
	cursor: pointer;
}

.footer-link:hover,
.footer-link:focus-visible {
	color: #1f7a3a;
	text-decoration: underline;
}

.footer-link:focus-visible {
	outline: 2px solid #1f7a3a;
	outline-offset: 3px;
	border-radius: 4px;
}

html.ion-palette-dark .footer-link {
	color: #94a3b8;
}

html.ion-palette-dark .footer-link:hover,
html.ion-palette-dark .footer-link:focus-visible {
	color: #63cd77;
}

html.ion-palette-dark .footer-link:focus-visible {
	outline-color: #63cd77;
}

/* Mobile Responsive */
@media (max-width: 650px) {
	header {
		height: 64px;
		padding: 0 18px;
		padding-top: env(safe-area-inset-top);
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
		align-items: center;
		text-align: center;
		gap: 8px;
	}
}
/* Download modal overlay */
.dl-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(3px);
}
.dl-modal {
  background: #ffffff;
  border-radius: 20px;
  padding: 32px 28px 24px;
  max-width: 440px;
  width: 100%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  color: #111827;
}
html.ion-palette-dark .dl-modal {
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
}
.dl-close {
  position: absolute;
  top: 16px;
  right: 18px;
  background: none;
  border: none;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
}
html.ion-palette-dark .dl-close { color: #94a3b8; }
.dl-icon-row {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.dl-icon {
  font-size: 2.5rem;
  color: #34a853;
}
.dl-title {
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 8px;
  color: #111827;
}
html.ion-palette-dark .dl-title { color: #f1f5f9; }
.dl-sub {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 20px;
}
html.ion-palette-dark .dl-sub { color: #94a3b8; }
.dl-notice {
  display: flex;
  gap: 10px;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}
html.ion-palette-dark .dl-notice {
  background: #2d2a1a;
  border-color: #92400e;
}
.dl-notice-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  color: #d97706;
}
.dl-notice-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #92400e;
  margin: 0 0 4px;
}
html.ion-palette-dark .dl-notice-title { color: #fbbf24; }
.dl-notice-body {
  font-size: 0.8rem;
  color: #78350f;
  margin: 0;
  line-height: 1.5;
}
html.ion-palette-dark .dl-notice-body { color: #fcd34d; }
.dl-fallback {
  text-align: center;
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0 0 20px;
}
html.ion-palette-dark .dl-fallback { color: #94a3b8; }
.dl-fallback-link {
  color: #34a853;
  font-weight: 600;
}
html.ion-palette-dark .dl-fallback-link { color: #63cd77; }
ion-button.pill.dl-got-it {
  width: 100%;
  --background: #34a853 !important;
  --color: #ffffff !important;
  --border-radius: 30px;
  font-weight: 600;
  margin: 0;
}
</style>
