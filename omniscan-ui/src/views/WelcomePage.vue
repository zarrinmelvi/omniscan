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
						By continuing, you agree to OmniScan's
						<a href="#" @click.prevent="openTermsModal">Terms and Conditions</a>.
					</p>
				</div>
			</div>

			<!-- Terms and Conditions Modal Overlay -->
			<ion-modal :is-open="isTermsOpen" class="terms-modal" @didDismiss="isTermsOpen = false">
				<div class="terms-card">
					<div class="terms-header">
						<h2>OmniScan Terms and Conditions</h2>
						<button type="button" class="close-icon-btn" aria-label="Close" @click="isTermsOpen = false">✕</button>
					</div>

					<div class="terms-scroll-area">
						<div class="terms-content">
							<p class="terms-date">Last Updated: September 7, 2026</p>

							<p>Welcome to OmniScan, a cross-platform pantry management and food information system developed as part of a Bachelor of Science in Information Technology capstone project at STI College San Jose Del Monte.</p>
							<p>These Terms &amp; Conditions (“Terms”) govern your access to and use of the OmniScan web application and mobile application (“Application” or “System”). By creating an account, accessing, or using OmniScan, you acknowledge that you have read, understood, and agreed to these Terms.</p>
							<p>If you do not agree with any part of these Terms, please discontinue your use of the Application.</p>

							<h4>1. Purpose of OmniScan</h4>
							<p>OmniScan is designed to assist users in making more informed food purchasing and household food management decisions.</p>
							<p>The Application provides features that may include:</p>
							<ul>
								<li>Food product scanning and image uploading;</li>
								<li>Ingredient text extraction and interpretation;</li>
								<li>Potential allergen detection;</li>
								<li>Halal logo and dietary compliance checking;</li>
								<li>Color-coded food safety alerts;</li>
								<li>Alternative product recommendations;</li>
								<li>Digital pantry management;</li>
								<li>Expiration and best-before date reminders;</li>
								<li>AI-generated recipe recommendations; and</li>
								<li>Personalized dietary profiles.</li>
							</ul>
							<p>OmniScan uses technologies such as Optical Character Recognition (OCR), computer vision, artificial intelligence, and reference databases to provide these features.</p>

							<h4>2. Eligibility and Account Registration</h4>
							<p>Users may be required to create an account to access certain features of OmniScan.</p>
							<p>When creating an account, you agree to:</p>
							<ul>
								<li>Provide accurate and truthful information;</li>
								<li>Keep your account information up to date;</li>
								<li>Keep your login credentials confidential;</li>
								<li>Not share your account with unauthorized individuals; and</li>
								<li>Notify the system administrators or support team of any suspected unauthorized access.</li>
							</ul>
							<p>You are responsible for activities performed through your account.</p>

							<h4>3. Dietary Profile Information</h4>
							<p>OmniScan allows users to create and manage personalized dietary profiles, including food allergies, allergen sensitivities, and Halal preferences.</p>
							<p>The information provided in your dietary profile is used to personalize food analysis, safety alerts, filtering, and recommendations.</p>
							<p>You are responsible for ensuring that the dietary information entered into your profile is complete and accurate. OmniScan cannot guarantee that every dietary restriction, allergy, ingredient, or certification will be identified.</p>

							<h4>4. Food Scanning and AI Analysis</h4>
							<p>OmniScan may analyze uploaded or scanned food product images using OCR, computer vision, artificial intelligence, and reference databases.</p>
							<p>The results provided by OmniScan may include:</p>
							<ul>
								<li>Ingredient information;</li>
								<li>Simplified ingredient explanations;</li>
								<li>Potential allergen warnings;</li>
								<li>Halal-related information;</li>
								<li>Dietary suitability indicators;</li>
								<li>Safety alerts; and</li>
								<li>Alternative product recommendations.</li>
							</ul>
							<p>The color-coded results may be presented as:</p>
							<ul>
								<li><strong>Green</strong> – Safe</li>
								<li><strong>Yellow</strong> – Caution</li>
								<li><strong>Red</strong> – Unsafe/Unsuitable</li>
							</ul>
							<p>These results are intended only as informational and decision-support guidance.</p>

							<h4>5. Food Safety Disclaimer</h4>
							<p>OmniScan does not guarantee that a food product is completely safe, allergen-free, Halal-certified, or suitable for a particular individual.</p>
							<p>Users must always verify the original product packaging, ingredient list, allergen statements, certification information, expiration or best-before dates, and other relevant product information before purchasing or consuming a food product.</p>
							<p>OmniScan should not be used as the sole basis for making decisions involving food allergies, severe dietary restrictions, medical conditions, or religious dietary requirements.</p>
							<p>If you have a serious food allergy or other health-related dietary concern, consult an appropriate qualified healthcare or dietary professional.</p>

							<h4>6. Limitations of Detection</h4>
							<p>OmniScan's detection and analysis capabilities are subject to the information available to the System.</p>
							<p>The System may not detect:</p>
							<ul>
								<li>Rare or newly identified allergens;</li>
								<li>Allergens not included in its reference database;</li>
								<li>All international Halal certifications;</li>
								<li>Newly released products not yet included in the product database;</li>
								<li>Products with unclear, damaged, missing, or unreadable labels;</li>
								<li>Products with unclear or absent Halal logos; or</li>
								<li>Ingredients whose composition cannot be reliably determined from the available information.</li>
							</ul>
							<p>The accuracy of scanning may also be affected by image quality, packaging design, text readability, lighting, print resolution, and completeness of the product label.</p>

							<h4>7. Halal Verification</h4>
							<p>OmniScan may identify selected Halal certification logos and analyze ingredient information related to Halal compliance.</p>
							<p>However, OmniScan does not represent itself as an official Halal certification authority.</p>
							<p>The absence of a recognized Halal logo or an “unverified” result does not necessarily mean that a product is non-Halal, while the detection of a logo does not independently guarantee the current validity of a certification.</p>
							<p>Users should verify certification information through the appropriate recognized Halal certification authority when necessary.</p>

							<h4>8. Pantry Management and Expiration Dates</h4>
							<p>OmniScan provides a digital pantry feature that allows users to store information about food products and monitor expiration or best-before dates.</p>
							<p>Users are responsible for accurately entering product information, expiration dates, best-before dates, product quantities, portion sizes, and other required pantry information.</p>
							<p>OmniScan provides reminders based on the information entered into the System. The Application does not guarantee that expiration dates are automatically or accurately identified from every product. Users are responsible for checking the actual date printed on the product packaging.</p>
							<p>Users should also update their pantry inventory when products are consumed, removed, discarded, or otherwise no longer available.</p>

							<h4>9. Recipe Recommendations</h4>
							<p>OmniScan may generate recipe suggestions based on available pantry ingredients and the user's dietary profile.</p>
							<p>Recipe recommendations may include suggested ingredients, quantities, portions, and preparation suggestions. AI-generated recipes are provided for informational and convenience purposes only.</p>
							<p>Users are responsible for verifying ingredient suitability, allergen information, Halal compliance, food freshness, proper food handling, cooking requirements, and appropriate ingredient quantities.</p>
							<p>Users should not rely solely on an AI-generated recipe to determine whether a meal is safe or suitable for them.</p>

							<h4>10. User-Uploaded Images and Information</h4>
							<p>Users may upload photographs of food products and related information for analysis.</p>
							<p>Users agree to upload only images and information that they have the right to submit and that are relevant to the intended use of OmniScan. Users should avoid uploading unnecessary personal, confidential, or sensitive information.</p>
							<p>OmniScan may process uploaded images and information to provide the System's scanning, analysis, and recommendation features.</p>

							<h4>11. Notifications and Reminders</h4>
							<p>OmniScan may send notifications regarding food items approaching their expiration dates, dietary warnings, recipe suggestions, account inactivity, and other system-related activities.</p>
							<p>Notifications are provided as reminders and may not always be received, displayed, or delivered on time due to device settings, connectivity issues, system interruptions, or other technical circumstances.</p>

							<h4>12. Account Inactivity and Deletion</h4>
							<p>OmniScan may monitor account activity for system administration purposes.</p>
							<p>An account that remains inactive for six (6) months may receive an email notification informing the user that the account is scheduled for deletion.</p>
							<p>If the account remains inactive for one (1) additional week after the notification, the account may be permanently deleted in accordance with the System's account-management procedures.</p>

							<h4>13. Acceptable Use</h4>
							<p>Users agree not to use OmniScan for unlawful purposes, attempt unauthorized access, disrupt System operations, upload malicious files, or misuse features. Violation of these Terms may result in suspension or termination of access.</p>

							<h4>14. System Availability</h4>
							<p>The developers aim to maintain OmniScan's availability; however, continuous or uninterrupted access is not guaranteed due to updates, server issues, or technical circumstances beyond control.</p>

							<h4>15. Accuracy of Information</h4>
							<p>While reasonable efforts are made, OmniScan does not guarantee that all information, analyses, classifications, recommendations, or alerts will always be complete, accurate, or current. Product packaging and formulations change over time.</p>

							<h4>16. Intellectual Property</h4>
							<p>The OmniScan name, system design, user interface, software components, documentation, logos, and original materials belong to their respective owners. Unauthorized copying or reproduction is prohibited.</p>

							<h4>17. Third-Party Services and Data Sources</h4>
							<p>OmniScan may rely on third-party technologies, services, or databases. Their availability and accuracy are outside the direct control of the development team.</p>

							<h4>18. Limitation of Liability</h4>
							<p>To the extent permitted by law, the OmniScan development team shall not be responsible for losses, damages, injuries, dietary reactions, or food-related incidents resulting from reliance solely on outputs provided by the Application.</p>

							<h4>19. User Responsibility</h4>
							<p>By using OmniScan, users acknowledge that they remain responsible for their own food purchasing, preparation, storage, consumption, and dietary decisions.</p>

							<h4>20. Privacy and Personal Information</h4>
							<p>OmniScan may collect information necessary to provide its features. Personal information is collected, stored, and processed in accordance with applicable data protection requirements.</p>

							<h4>21. Changes to These Terms</h4>
							<p>The development team may update or modify these Terms when necessary. Continued use of OmniScan after updated Terms become effective constitutes acknowledgment of the revised Terms.</p>

							<h4>22. Termination of Access</h4>
							<p>Access may be suspended or terminated if a user violates these Terms or engages in harmful activity.</p>

							<h4>23. Contact and Support</h4>
							<p>Users may contact support regarding technical issues or questions through the Contact Support feature available within the Application.</p>

							<h4>24. Acceptance of Terms</h4>
							<p>By selecting “I Agree”, “Accept”, or by accessing and using OmniScan, you acknowledge that you have read, understood, and agreed to comply with these Terms &amp; Conditions.</p>

							<div class="terms-footer-meta">
								<p><strong>OmniScan</strong></p>
								<p>A Cross-Platform Pantry Manager with Computer Vision for Allergen and Halal Detection and Artificial Intelligence Recommendations</p>
								<p>Developed as a Capstone Project</p>
								<p>STI College San Jose Del Monte</p>
								<p>Bachelor of Science in Information Technology</p>
							</div>
						</div>
					</div>

					<div class="terms-action-bar">
						<button type="button" class="btn-terms-agree" @click="agreeAndClose">I Agree</button>
					</div>
				</div>
			</ion-modal>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonPage, IonContent, IonButton, IonModal } from '@ionic/vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isTermsOpen = ref(false)

function goToRegister() {
	router.push('/register')
}

function goToLogin() {
	router.push('/login')
}

function openTermsModal() {
	isTermsOpen.value = true
}

function agreeAndClose() {
	isTermsOpen.value = false
}
</script>

<style scoped>
.welcome-content {
	--background: #10130f;
}

.welcome-bg {
	position: relative;
	height: 100%;
	min-height: 100dvh;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;

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
	cursor: pointer;
}
</style>

<!-- Global CSS Overrides for Terms & Conditions Modal Popup -->
<style>
ion-modal.terms-modal {
	--height: 85%;
	--width: 92%;
	--max-width: 440px;
	--border-radius: 20px;
	--background: transparent;
	--box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
}

.terms-card {
	background: #ffffff;
	border-radius: 20px;
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	box-sizing: border-box;
}

.terms-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 20px 14px;
	border-bottom: 1px solid #e2e8f0;
}

.terms-header h2 {
	margin: 0;
	font-size: 1.1rem;
	font-weight: 700;
	color: #0f172a;
}

.close-icon-btn {
	background: transparent;
	border: none;
	font-size: 1.15rem;
	color: #64748b;
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.terms-scroll-area {
	flex: 1;
	overflow-y: auto;
	padding: 16px 20px;
}

.terms-date {
	font-size: 0.78rem;
	color: #64748b;
	margin: 0 0 16px;
	font-weight: 500;
}

.terms-content h4 {
	font-size: 0.88rem;
	font-weight: 700;
	color: #1e293b;
	margin: 16px 0 6px;
}

.terms-content p {
	font-size: 0.82rem;
	line-height: 1.45;
	color: #334155;
	margin: 0 0 10px;
}

.terms-content ul {
	margin: 0 0 12px;
	padding-left: 20px;
}

.terms-content li {
	font-size: 0.82rem;
	line-height: 1.4;
	color: #334155;
	margin-bottom: 4px;
}

.terms-footer-meta {
	margin-top: 20px;
	padding-top: 14px;
	border-top: 1px dashed #cbd5e1;
}

.terms-footer-meta p {
	font-size: 0.75rem;
	color: #64748b;
	margin: 2px 0;
}

.terms-action-bar {
	padding: 12px 20px 18px;
	border-top: 1px solid #e2e8f0;
	background: #ffffff;
}

.btn-terms-agree {
	width: 100%;
	height: 44px;
	background: #05c450;
	border: none;
	border-radius: 9999px;
	color: #ffffff;
	font-weight: 600;
	font-size: 0.95rem;
	cursor: pointer;
}
</style>