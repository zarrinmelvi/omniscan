<template>
	<ion-page class="scan-page">
		<ion-content class="scan-content">
			<div class="page-container">
				<!-- Top Header Area -->
				<header class="header-section">
					<h1 class="page-title">OmniScan</h1>
					<p class="page-subtitle">Scan any product package showing Halal logo and ingredient list</p>
				</header>

				<!-- Hidden File Input -->
				<input ref="fileInputRef" type="file" accept="image/*" capture="environment" class="hidden-input" @change="onFileSelected" />

				<!-- Interactive Controls Section -->
				<div class="controls-section">
					<!-- Prompt card for back photo step -->
					<div v-if="captureStage === 'back' || isBackCaptured" class="back-prompt-card">
						<p class="back-prompt-text">
							<template v-if="isBackCaptured"> <strong>Back captured.</strong> Please wait, upload in progress. </template>
							<template v-else>
								<strong>Front captured.</strong> Now scan or upload the <strong>back</strong> of the product so the ingredients list
								can be read.
							</template>
						</p>
						<ion-button
							v-if="!isBackCaptured && !isUploading"
							expand="block"
							fill="clear"
							size="small"
							class="skip-btn"
							@click="skipBackPhoto">
							Skip — use front photo only
						</ion-button>
					</div>

					<!-- Primary Action Button -->
					<ion-button expand="block" class="btn-primary" :disabled="isUploading || isCoolingDown || isResultModalOpen" @click="openCamera">
						<ion-spinner v-if="isCoolingDown" name="crescent" slot="start" />
						<ion-icon v-else :icon="scanOutline" slot="start" />
						<span v-if="isCoolingDown">Processing… ({{ remainingSeconds }}s)</span>
						<span v-else-if="hasScannedAtLeastOnce || isUploading">Scan Again</span>
						<span v-else-if="captureStage === 'back'">Scan Back of Item</span>
						<span v-else>Scan Product</span>
					</ion-button>

					<!-- Secondary Action Button -->
					<ion-button
						expand="block"
						class="btn-secondary"
						:disabled="isUploading || isCoolingDown || isResultModalOpen"
						@click="isPhotoModalOpen = true">
						<ion-icon :icon="cameraOutline" slot="start" />
						UPLOAD A PHOTO
					</ion-button>

					<ion-card class="results-placeholder">
						<ion-card-header>
							<ion-card-title>Analysis Results</ion-card-title>
						</ion-card-header>
						<ion-card-content>
							<div v-if="!lastFileName" class="placeholder-empty">
								<ion-icon :icon="documentTextOutline" size="large"></ion-icon>
								<p>No scan yet. Results will appear here after you upload an image.</p>
							</div>
							<div v-else>
								<p><strong>File:</strong> {{ lastFileName }}</p>
								<p><strong>Status:</strong> {{ analysisStatus }}</p>
							</div>
						</ion-card-content>
					</ion-card>
				</div>
			</div>
		</ion-content>

		<!-- ===== LIVE CAMERA VIEWFINDER OVERLAY ===== -->
		<div v-if="isCameraOpen" class="camera-overlay">
			<!-- Video element applies blur class during image capture -->
			<video 
				ref="videoRef" 
				class="viewfinder-video" 
				:class="{ 'viewfinder-video--blurred': isSavingImage }" 
				autoplay 
				muted 
				playsinline
			></video>
			<canvas ref="canvasRef" class="hidden-canvas"></canvas>

			<button type="button" class="camera-close-btn" aria-label="Close camera" @click="closeCamera">
				<ion-icon :icon="closeOutline"></ion-icon>
			</button>

			<div class="viewfinder-overlay">
				<div class="bracket bracket-tl"></div>
				<div class="bracket bracket-tr"></div>
				<div class="bracket bracket-bl"></div>
				<div class="bracket bracket-br"></div>
			</div>

			<!-- Dedicated Pop-up modal for "Saving image..." state -->
			<div v-if="isSavingImage" class="processing-popup">
				<ion-spinner name="crescent" color="light" />
				<p class="processing-popup__text">Saving image…</p>
			</div>

			<div v-if="cameraError" class="camera-error">
				<p>{{ cameraError }}</p>
				<ion-button size="small" fill="outline" color="light" @click="fallbackToFilePicker"> Use Photo Library Instead </ion-button>
			</div>
			<template v-else-if="!isSavingImage">
				<div class="live-instruction" :class="{ 'live-instruction--warn': isLowLight }">
					{{ liveInstruction }}
				</div>

				<button type="button" class="capture-btn" :disabled="!isCameraReady || isCapturing" aria-label="Capture photo" @click="handleCapture">
					<span class="capture-btn__ring"></span>
				</button>
			</template>
		</div>

		<PhotoPantryUploadModal :is-open="isPhotoModalOpen" @close="isPhotoModalOpen = false" @created="onPhotoUploadCreated" />

		<ScanResultModal
			:is-open="isResultModalOpen"
			:data="analysisResult || undefined"
			@close="isResultModalOpen = false"
			@added="onPantryItemAdded" />
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
	IonPage,
	IonContent,
	IonButton,
	IonSpinner,
	IonIcon,
	IonCard,
	IonCardHeader,
	IonCardTitle,
	IonCardContent,
	onIonViewWillEnter,
} from '@ionic/vue'

import { API_BASE_URL } from '@/utils/api'

import { cameraOutline, documentTextOutline, closeOutline, scanOutline } from 'ionicons/icons'
import ScanResultModal from '../components/ScanResultModal.vue'
import PhotoPantryUploadModal from '../components/PhotoPantryUploadModal.vue'

const TOKEN_KEY = 'omniscan_token'

const isPhotoModalOpen = ref(false)

function onPhotoUploadCreated(): void {
	isPhotoModalOpen.value = false
}

interface ScanResultDisplay {
	product: {
		id: string
		brand_name: string
		product_name: string
		ingredients_text: string
		simplified_ingredients: string
		halal_logo_id: number | null
		image_base64: string | null
		image_base64_back: string | null
	}
	safety_verdict: 'Red' | 'Yellow' | 'Green'
	reasons: string[]
	scanned_at: string
	matched_user_allergens: string[] | null
	halal: {
		logo_detected: boolean
		certifying_body: string | null
		is_accredited: boolean | null
		matched_known_logo: boolean
	}
	isNotProduct?: boolean
}

const analysisResult = ref<ScanResultDisplay | null>(null)
const isResultModalOpen = ref(false)

function onPantryItemAdded(): void {}

const COOLDOWN_MS = 10_000
const COOLDOWN_TICK_MS = 1_000

const fileInputRef = ref<HTMLInputElement | null>(null)
const isCoolingDown = ref(false)
const isUploading = ref(false)
const isBackCaptured = ref(false)
const hasScannedAtLeastOnce = ref(false)
const remainingSeconds = ref(0)

const lastFileName = ref<string | null>(null)
const analysisStatus = ref<string>('Idle')

type CaptureStage = 'front' | 'back'
const captureStage = ref<CaptureStage>('front')
const frontFile = ref<File | null>(null)

let cooldownTimeoutId: number | null = null
let cooldownIntervalId: number | null = null

function resetScanState(): void {
	hasScannedAtLeastOnce.value = false
	captureStage.value = 'front'
	frontFile.value = null
	isBackCaptured.value = false
	isUploading.value = false
	isCoolingDown.value = false
	remainingSeconds.value = 0
	clearTimers()
	lastFileName.value = null
	analysisStatus.value = 'Idle'
}

onIonViewWillEnter(() => {
	resetScanState()
})

function triggerFileInput(): void {
	if (isCoolingDown.value || isUploading.value) {
		return
	}
	fileInputRef.value?.click()
}

async function onFileSelected(event: Event): Promise<void> {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]

	input.value = ''

	if (!file) {
		return
	}

	await processCapturedFile(file)
}

async function processCapturedFile(file: File): Promise<void> {
	if (isCoolingDown.value || isUploading.value) {
		return
	}

	if (captureStage.value === 'front') {
		frontFile.value = file
		// Immediately submit the front photo to evaluate whether it's a food item
		await submitScan(file, null)
		return
	}

	isBackCaptured.value = true
	await submitScan(frontFile.value!, file)
}

async function skipBackPhoto(): Promise<void> {
	if (!frontFile.value || isCoolingDown.value || isUploading.value) {
		return
	}
	await submitScan(frontFile.value, null)
}

async function submitScan(front: File, back: File | null): Promise<void> {
	isUploading.value = true
	lockButton()
	analysisStatus.value = 'Uploading…'

	try {
		await handleUpload(front, back)
		hasScannedAtLeastOnce.value = true
	} catch (err) {
		analysisStatus.value = err instanceof Error ? err.message : 'Upload failed'
		console.error('Scan upload failed:', err)
	} finally {
		// ONLY reset capture state if we are done with the scan (not waiting for back photo)
		if (captureStage.value !== 'back') {
			frontFile.value = null
			captureStage.value = 'front'
			isBackCaptured.value = false
		}
		isUploading.value = false
	}
}

async function handleUpload(front: File, back: File | null): Promise<void> {
	const formData = new FormData()
	formData.append('image', front)
	if (back) {
		formData.append('image_back', back)
	}

	const token = localStorage.getItem(TOKEN_KEY)

	if (!token) {
		throw new Error('You must be logged in to scan an item.')
	}

	const response = await fetch(`${API_BASE_URL}/api/scan`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	})

	if (!response.ok) {
		if (response.status === 401) {
			throw new Error('Your session has expired. Please log in again.')
		}

		const errorBody = await response.json().catch(() => null)
		const errorMessage = errorBody?.statusMessage || `Scan failed with status: ${response.status}`

		// Cleanly handle 422 for non-food items directly without throwing
		if (response.status === 422) {
			analysisResult.value = {
				product: {
					id: '0',
					brand_name: '',
					product_name: 'Non-Food Item',
					ingredients_text: '',
					simplified_ingredients: '',
					halal_logo_id: null,
					image_base64: null,
					image_base64_back: null,
				},
				safety_verdict: 'Red',
				reasons: [errorMessage],
				scanned_at: new Date().toISOString(),
				matched_user_allergens: [],
				halal: {
					logo_detected: false,
					certifying_body: null,
					is_accredited: null,
					matched_known_logo: false,
				},
				isNotProduct: true,
			} as any

			// Reset scan stage and clear inline placeholder card text
			captureStage.value = 'front'
			frontFile.value = null
			lastFileName.value = null
			analysisStatus.value = 'Idle'

			// Trigger modal (ScanResultModal renders ion-alert for non-products)
			isResultModalOpen.value = true
			return
		}

		throw new Error(errorMessage)
	}

	const result = await response.json()
	const scan = result.scan

	// Prompt for back scan ONLY if valid food product lacks ingredient photo
	if (!back && captureStage.value === 'front') {
		captureStage.value = 'back'
		analysisStatus.value = 'Front captured — now scan or upload the back'
		return
	}

	// Valid food product scan complete — populate modal model
	analysisResult.value = {
		product: {
			id: String(scan.product.id),
			brand_name: scan.product.brand_name,
			product_name: scan.product.product_name,
			ingredients_text: scan.product.ingredient_text,
			simplified_ingredients: scan.product.simplified_ingredients,
			halal_logo_id: scan.product.halal_logo_id ?? null,
			image_base64: scan.product.image_base64 ?? null,
			image_base64_back: scan.product.image_base64_back ?? null,
		},
		safety_verdict: scan.safety_verdict,
		reasons: scan.flag_reason ? scan.flag_reason.split(', ') : [],
		scanned_at: scan.scan_time,
		matched_user_allergens: Array.isArray(scan.matched_user_allergens) ? scan.matched_user_allergens : [],
		halal: scan.halal,
		isNotProduct: false,
	}

	analysisStatus.value = `Analysis complete — Verdict: ${scan.safety_verdict}`
	isResultModalOpen.value = true

	lastFileName.value = null
	analysisStatus.value = 'Idle'
}

function lockButton(): void {
	clearTimers()

	isCoolingDown.value = true
	remainingSeconds.value = Math.ceil(COOLDOWN_MS / 1000)

	cooldownIntervalId = window.setInterval(() => {
		remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
	}, COOLDOWN_TICK_MS)

	cooldownTimeoutId = window.setTimeout(() => {
		isCoolingDown.value = false
		remainingSeconds.value = 0
		clearTimers()
	}, COOLDOWN_MS)
}

function clearTimers(): void {
	if (cooldownIntervalId !== null) {
		clearInterval(cooldownIntervalId)
		cooldownIntervalId = null
	}
	if (cooldownTimeoutId !== null) {
		clearTimeout(cooldownTimeoutId)
		cooldownTimeoutId = null
	}
}

const LOW_LIGHT_THRESHOLD = 60
const VERY_LOW_LIGHT_THRESHOLD = LOW_LIGHT_THRESHOLD / 2
const BRIGHTNESS_SAMPLE_SIZE = 32

const isCameraOpen = ref(false)
const isCameraReady = ref(false)
const isCapturing = ref(false)
const isSavingImage = ref(false)
const cameraError = ref<string | null>(null)
const liveInstruction = ref<string>('Align product within frame')
const isLowLight = ref(false)

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let mediaStream: MediaStream | null = null
let brightnessLoopId: number | null = null
let brightnessCanvas: HTMLCanvasElement | null = null
let brightnessCtx: CanvasRenderingContext2D | null = null

async function openCamera(): Promise<void> {
	if (isCoolingDown.value || isUploading.value) {
		return
	}

	cameraError.value = null
	isCameraOpen.value = true

	try {
		mediaStream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: 'environment',
				width: { ideal: 1280 },
				height: { ideal: 720 },
			},
			audio: false,
		})

		if (videoRef.value) {
			videoRef.value.srcObject = mediaStream
			await videoRef.value.play()
			isCameraReady.value = true
			startBrightnessLoop()
		}
	} catch (err) {
		cameraError.value = 'Camera access was denied or unavailable.'
		console.error('[ScanPage] getUserMedia failed:', err)
	}
}

function closeCamera(): void {
	stopBrightnessLoop()
	mediaStream?.getTracks().forEach((track) => track.stop())
	mediaStream = null
	isCameraReady.value = false
	isCapturing.value = false
	isSavingImage.value = false
	isCameraOpen.value = false
	cameraError.value = null
}

function fallbackToFilePicker(): void {
	closeCamera()
	triggerFileInput()
}

function startBrightnessLoop(): void {
	if (!brightnessCanvas) {
		brightnessCanvas = document.createElement('canvas')
		brightnessCanvas.width = BRIGHTNESS_SAMPLE_SIZE
		brightnessCanvas.height = BRIGHTNESS_SAMPLE_SIZE
		brightnessCtx = brightnessCanvas.getContext('2d', { willReadFrequently: true })
	}

	const sample = (): void => {
		if (!isCameraOpen.value || !videoRef.value || !brightnessCtx || !brightnessCanvas) {
			return
		}

		if (videoRef.value.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
			brightnessCtx.drawImage(videoRef.value, 0, 0, BRIGHTNESS_SAMPLE_SIZE, BRIGHTNESS_SAMPLE_SIZE)

			const { data } = brightnessCtx.getImageData(0, 0, BRIGHTNESS_SAMPLE_SIZE, BRIGHTNESS_SAMPLE_SIZE)

			let total = 0
			const pixelCount = data.length / 4

			for (let i = 0; i < data.length; i += 4) {
				total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
			}

			const averageLuminance = total / pixelCount
			isLowLight.value = averageLuminance < LOW_LIGHT_THRESHOLD

			liveInstruction.value = isLowLight.value
				? averageLuminance < VERY_LOW_LIGHT_THRESHOLD
					? 'Too dark! Move to a brighter area'
					: 'Need more light'
				: 'Align product within frame'
		}

		brightnessLoopId = requestAnimationFrame(sample)
	}

	brightnessLoopId = requestAnimationFrame(sample)
}

function stopBrightnessLoop(): void {
	if (brightnessLoopId !== null) {
		cancelAnimationFrame(brightnessLoopId)
		brightnessLoopId = null
	}
}

function handleCapture(): void {
	if (!videoRef.value || !canvasRef.value || isCapturing.value) return

	isCapturing.value = true
	isSavingImage.value = true

	const video = videoRef.value
	const canvas = canvasRef.value

	const framePercent = {
		x: 0.12,
		y: 0.22,
		width: 0.76,
		height: 0.48
	}

	const cropX = video.videoWidth * framePercent.x
	const cropY = video.videoHeight * framePercent.y
	const cropWidth = video.videoWidth * framePercent.width
	const cropHeight = video.videoHeight * framePercent.height

	canvas.width = cropWidth
	canvas.height = cropHeight

	const ctx = canvas.getContext('2d')
	if (!ctx) {
		isCapturing.value = false
		isSavingImage.value = false
		return
	}

	ctx.drawImage(
		video,
		cropX,
		cropY,
		cropWidth,
		cropHeight,
		0,
		0,
		cropWidth,
		cropHeight
	)

	canvas.toBlob(
		(blob) => {
			if (!blob) {
				cameraError.value = 'Could not capture photo. Please try again.'
				isCapturing.value = false
				isSavingImage.value = false
				return
			}

			isSavingImage.value = false

			try {
				const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
				closeCamera()
				void processCapturedFile(file)
			} catch (err) {
				isCapturing.value = false
				cameraError.value = 'An error occurred while saving the photo.'
			}
		},
		'image/jpeg',
		0.85,
	)
}

onMounted(() => {})

onBeforeUnmount(() => {
	clearTimers()
	stopBrightnessLoop()
	mediaStream?.getTracks().forEach((track) => track.stop())
})
</script>

<style scoped>
.scan-page {
	--background: #ffffff;
}

.scan-content {
	--background: #ffffff;
	--color: #1f2937;
}

.page-container {
	display: flex;
	flex-direction: column;
	padding: 16px 20px;
	box-sizing: border-box;
	max-width: 480px;
	margin: 0 auto;
}

.hidden-input {
	display: none;
}

.header-section {
	text-align: center;
	margin-top: 8px;
	margin-bottom: 24px;
}

.page-title {
	color: #1f2937;
	font-size: 1.5rem;
	font-weight: 700;
	margin: 0 0 6px 0;
}

.page-subtitle {
	color: #6b7280;
	font-size: 0.875rem;
	margin: 0;
	line-height: 1.4;
	padding: 0 16px;
}

.controls-section {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;
}

.back-prompt-card {
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	padding: 12px;
	text-align: center;
	color: #334155;
	font-size: 0.85rem;
}

.skip-btn {
	--color: #0284c7;
	margin-top: 4px;
}

.btn-primary {
	--background: #00b14f;
	--background-activated: #009643;
	--color: #ffffff;
	--border-radius: 9999px;
	font-weight: 700;
	height: 48px;
	margin: 0;
}

.btn-secondary {
	--background: #f1f5f9;
	--background-activated: #e2e8f0;
	--color: #27303e;
	--border-radius: 9999px;
	--border-color: #e2e8f0;
	--border-width: 1px;
	--border-style: solid;
	font-weight: 700;
	font-size: 0.85rem;
	letter-spacing: 0.5px;
	height: 48px;
	margin: 0;
}

.results-placeholder {
	margin-top: 8px;
	--background: #f8fafc;
	--color: #1f2937;
	border: 1px solid #e2e8f0;
	border-radius: 14px;
	box-shadow: none;
}

.results-placeholder ion-card-title {
	color: #1f2937;
	font-size: 1rem;
	font-weight: 600;
}

.placeholder-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 16px 0;
	color: #94a3b8;
	text-align: center;
}

.camera-overlay {
	position: fixed;
	inset: 0;
	z-index: 1000;
	background: #000;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.viewfinder-video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	transition: filter 0.3s ease;
}

.viewfinder-video--blurred {
	filter: blur(8px) brightness(0.7);
}

.hidden-canvas {
	display: none;
}

.camera-close-btn {
	position: absolute;
	top: calc(16px + env(safe-area-inset-top, 0px));
	left: 16px;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: rgba(0, 0, 0, 0.5);
	border: none;
	color: #fff;
	font-size: 1.3rem;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2;
}

.viewfinder-overlay {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.bracket {
	position: absolute;
	width: 40px;
	height: 40px;
	border-color: #00b14f;
	border-style: solid;
	border-width: 0;
}

.bracket-tl {
	top: 22%;
	left: 12%;
	border-top-width: 4px;
	border-left-width: 4px;
	border-top-left-radius: 8px;
}

.bracket-tr {
	top: 22%;
	right: 12%;
	border-top-width: 4px;
	border-right-width: 4px;
	border-top-right-radius: 8px;
}

.bracket-bl {
	bottom: 30%;
	left: 12%;
	border-bottom-width: 4px;
	border-left-width: 4px;
	border-bottom-left-radius: 8px;
}

.bracket-br {
	bottom: 30%;
	right: 12%;
	border-bottom-width: 4px;
	border-right-width: 4px;
	border-bottom-right-radius: 8px;
}

.processing-popup {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: rgba(0, 0, 0, 0.75);
	padding: 20px 32px;
	border-radius: 16px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	z-index: 10;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.processing-popup__text {
	color: #ffffff;
	font-size: 1rem;
	font-weight: 600;
	margin: 0;
}

.live-instruction {
	position: absolute;
	top: 12%;
	left: 50%;
	transform: translateX(-50%);
	background: rgba(0, 0, 0, 0.6);
	color: #ffffff;
	padding: 8px 16px;
	border-radius: 999px;
	font-size: 0.85rem;
	font-weight: 600;
	white-space: nowrap;
}

.live-instruction--warn {
	background: rgba(220, 38, 38, 0.85);
}

.capture-btn {
	position: absolute;
	bottom: calc(6% + env(safe-area-inset-bottom, 0px));
	left: 50%;
	transform: translateX(-50%);
	width: 72px;
	height: 72px;
	border-radius: 50%;
	background: transparent;
	border: 4px solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	transition:
		transform 0.1s ease,
		border-color 0.1s ease;
	cursor: pointer;
}

.capture-btn:active {
	transform: translateX(-50%) scale(0.95);
	border-color: #d1d5db;
}

.capture-btn:disabled {
	opacity: 0.4;
}

.capture-btn__ring {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: #ffffff;
	transition: background-color 0.1s ease;
}

.capture-btn:active .capture-btn__ring {
	background-color: #9ca3af;
}

.camera-error {
	position: absolute;
	bottom: 15%;
	left: 50%;
	transform: translateX(-50%);
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	padding: 16px 20px;
	border-radius: 12px;
	text-align: center;
	max-width: 80%;
}
</style>