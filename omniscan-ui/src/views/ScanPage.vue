<!-- src/views/ScanPage.vue -->
<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-title>Scan</ion-title>
			</ion-toolbar>
		</ion-header>

		<ion-content class="ion-padding">
			<div class="scan-container">
				<input ref="fileInputRef" type="file" accept="image/*" capture="environment" class="hidden-input" @change="onFileSelected" />

				<ion-card v-if="captureStage === 'back'" class="back-prompt-card">
					<ion-card-content>
						<p class="back-prompt-text">
							<strong>Front captured.</strong> Now scan or upload the <strong>back</strong> of the product so the ingredients list can
							be read.
						</p>
						<ion-button expand="block" fill="clear" size="small" @click="skipBackPhoto"> Skip — use front photo only </ion-button>
					</ion-card-content>
				</ion-card>

				<ion-button expand="block" size="large" class="scan-button" :disabled="isCoolingDown" @click="openCamera">
					<ion-spinner v-if="isCoolingDown" name="crescent" slot="start"></ion-spinner>
					<ion-icon v-else :icon="cameraOutline" slot="start"></ion-icon>
					<span v-if="isCoolingDown"> Processing… ({{ remainingSeconds }}s) </span>
					<span v-else-if="captureStage === 'back'">Scan Back of Item</span>
					<span v-else>Scan Item</span>
				</ion-button>

				<!-- NOTE: this opens PhotoPantryUploadModal, a separate component not
				     reviewed in this change — its source wasn't provided, so it's left
				     untouched rather than assumed to participate in the front/back
				     capture flow below. Worth confirming separately whether it should
				     also support a back photo. -->
				<ion-button expand="block" size="large" fill="outline" class="upload-button" @click="isPhotoModalOpen = true">
					<ion-icon :icon="cloudUploadOutline" slot="start"></ion-icon>
					Upload a Photo
				</ion-button>

				<ion-note v-if="isCoolingDown" class="cooldown-note">
					Please wait, upload in progress. Button re-enables in {{ remainingSeconds }}s.
				</ion-note>

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
		</ion-content>

		<!-- ===== LIVE CAMERA VIEWFINDER OVERLAY ===== -->
		<div v-if="isCameraOpen" class="camera-overlay">
			<video ref="videoRef" class="viewfinder-video" autoplay muted playsinline></video>
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

			<div v-if="cameraError" class="camera-error">
				<p>{{ cameraError }}</p>
				<ion-button size="small" fill="outline" color="light" @click="fallbackToFilePicker"> Use Photo Library Instead </ion-button>
			</div>
			<template v-else>
				<div class="live-instruction" :class="{ 'live-instruction--warn': isLowLight }">
					{{ liveInstruction }}
				</div>

				<button type="button" class="capture-btn" :disabled="!isCameraReady" aria-label="Capture photo" @click="handleCapture">
					<span class="capture-btn__ring"></span>
				</button>
			</template>
		</div>

		<PhotoPantryUploadModal :is-open="isPhotoModalOpen" @close="isPhotoModalOpen = false" @created="onPhotoUploadCreated" />

		<ScanResultModal :is-open="isResultModalOpen" :data="analysisResult" @close="isResultModalOpen = false" @added="onPantryItemAdded" />
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
	IonPage,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonContent,
	IonButton,
	IonSpinner,
	IonIcon,
	IonNote,
	IonCard,
	IonCardHeader,
	IonCardTitle,
	IonCardContent,
} from '@ionic/vue'
import { cameraOutline, documentTextOutline, cloudUploadOutline, closeOutline } from 'ionicons/icons'
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
	matched_user_allergens: string[]
}

const analysisResult = ref<ScanResultDisplay | null>(null)
const isResultModalOpen = ref(false)

function onPantryItemAdded(): void {
	// Placeholder hook — wire up a toast/snackbar here if you want a
	// confirmation after a successful Add to Pantry submit.
}

const COOLDOWN_MS = 10_000
const COOLDOWN_TICK_MS = 1_000

const fileInputRef = ref<HTMLInputElement | null>(null)
const isCoolingDown = ref(false)
const remainingSeconds = ref(0)

const lastFileName = ref<string | null>(null)
const analysisStatus = ref<string>('Idle')

// ============================================================
// Front/back capture stage. Both capture sources (native file
// picker and live camera) feed into processCapturedFile() below,
// which branches on this to decide whether the file just captured
// is the front (store it, prompt for back) or the back (upload
// both). A user can also skip the back photo entirely via
// skipBackPhoto() and submit front-only, same as scanning used to
// work before this change.
// ============================================================
type CaptureStage = 'front' | 'back'
const captureStage = ref<CaptureStage>('front')
const frontFile = ref<File | null>(null)

let cooldownTimeoutId: number | null = null
let cooldownIntervalId: number | null = null

function triggerFileInput(): void {
	if (isCoolingDown.value) {
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

/**
 * Shared entry point for both capture sources (native file picker and the
 * live camera overlay below). On the first call (captureStage 'front') this
 * just stores the file and flips to the 'back' stage instead of uploading —
 * the actual /api/scan call only happens once we have the back photo too
 * (or the user explicitly skips it via skipBackPhoto).
 */
async function processCapturedFile(file: File): Promise<void> {
	if (isCoolingDown.value) {
		return
	}

	if (captureStage.value === 'front') {
		frontFile.value = file
		captureStage.value = 'back'
		lastFileName.value = file.name
		analysisStatus.value = 'Front captured — now scan or upload the back'
		return
	}

	// captureStage is 'back' here, and frontFile.value must already be set —
	// the only way to reach 'back' is via the branch above.
	await submitScan(frontFile.value!, file)
}

async function skipBackPhoto(): Promise<void> {
	if (!frontFile.value || isCoolingDown.value) {
		return
	}
	await submitScan(frontFile.value, null)
}

async function submitScan(front: File, back: File | null): Promise<void> {
	lockButton()
	analysisStatus.value = 'Uploading…'

	try {
		await handleUpload(front, back)
	} catch (err) {
		analysisStatus.value = 'Upload failed'
		console.error('Scan upload failed:', err)
	} finally {
		// Reset for the next scan regardless of success/failure — an errored
		// upload shouldn't leave the UI stuck expecting a back photo for a
		// front image that's already been (attempted to be) submitted.
		frontFile.value = null
		captureStage.value = 'front'
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

	const response = await fetch('/api/scan', {
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
		throw new Error(`Scan failed with status: ${response.status}`)
	}

	const result = await response.json()
	const scan = result.scan

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
		matched_user_allergens: scan.matched_user_allergens ?? [],
	}

	analysisStatus.value = `Analysis complete — Verdict: ${scan.safety_verdict}`
	isResultModalOpen.value = true

	// The modal now owns displaying the result — revert the inline
	// placeholder card back to its empty state rather than leaving stale
	// "Analysis complete" text behind it.
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

// ============================================================
// Live camera viewfinder (feeds into the same processCapturedFile
// pipeline as the native file picker — no separate endpoint, no
// separate auth handling, no separate response mapping).
// ============================================================

const LOW_LIGHT_THRESHOLD = 60 // 0-255 luminance scale
const VERY_LOW_LIGHT_THRESHOLD = LOW_LIGHT_THRESHOLD / 2
const BRIGHTNESS_SAMPLE_SIZE = 32

const isCameraOpen = ref(false)
const isCameraReady = ref(false)
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
	if (isCoolingDown.value) {
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
	if (!videoRef.value || !canvasRef.value) return

	const video = videoRef.value
	const canvas = canvasRef.value
	canvas.width = video.videoWidth
	canvas.height = video.videoHeight

	const ctx = canvas.getContext('2d')
	if (!ctx) return

	ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

	canvas.toBlob(
		(blob) => {
			if (!blob) {
				cameraError.value = 'Could not capture photo. Please try again.'
				return
			}

			const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
			closeCamera()
			void processCapturedFile(file)
		},
		'image/jpeg',
		0.85,
	)
}

onMounted(() => {
	// Camera only starts when the user taps "Scan Item" (openCamera),
	// not on page mount — keeps the file-picker flow untouched by default.
})

onBeforeUnmount(() => {
	clearTimers()
	stopBrightnessLoop()
	mediaStream?.getTracks().forEach((track) => track.stop())
})
</script>

<style scoped>
.scan-container {
	display: flex;
	flex-direction: column;
	gap: 12px;
	max-width: 480px;
	margin: 0 auto;
}

.hidden-input {
	display: none;
}

.scan-button {
	margin-top: 24px;
	--border-radius: 12px;
	font-weight: 600;
}

.upload-button {
	--border-radius: 12px;
	font-weight: 600;
}

.cooldown-note {
	text-align: center;
	font-size: 0.85rem;
	color: var(--ion-color-medium);
}

.results-placeholder {
	margin-top: 24px;
}

.placeholder-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 24px 0;
	color: var(--ion-color-medium);
	text-align: center;
}

/* ===== Live camera viewfinder overlay ===== */
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
	border-color: #22c55e;
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
}

.capture-btn:disabled {
	opacity: 0.4;
}

.capture-btn__ring {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: #ffffff;
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
