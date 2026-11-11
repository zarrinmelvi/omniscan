import { ref, watch } from 'vue'

const CAMERA_PERMISSION_KEY = 'omniscan_camera_permission'

// Module-level singleton ref — shared across all component instances in the same page.
const hasPermission = ref(localStorage.getItem(CAMERA_PERMISSION_KEY) === 'true')

// Keep localStorage in sync whenever hasPermission changes
watch(hasPermission, (enabled) => {
	localStorage.setItem(CAMERA_PERMISSION_KEY, String(enabled))
})

// Sync across browser tabs via the storage event
window.addEventListener('storage', (e) => {
	if (e.key === CAMERA_PERMISSION_KEY) {
		hasPermission.value = e.newValue === 'true'
	}
})

export function useCameraPermission() {
	/**
	 * Request camera permission from the user via getUserMedia.
	 * Returns true if permission was granted, false otherwise.
	 */
	async function requestPermission(): Promise<boolean> {
		// Guard: on desktop or browsers without mediaDevices, no permission to
		// request — leave the saved state untouched and return false.
		if (!navigator.mediaDevices?.getUserMedia) {
			console.warn('[useCameraPermission] getUserMedia not available on this platform.')
			return false
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			})

			// Permission granted - close the stream immediately
			stream.getTracks().forEach(track => track.stop())

			// Update the shared permission state
			hasPermission.value = true
			return true
		} catch (err) {
			// NotAllowedError = the user explicitly denied (or previously denied)
			// camera access.  Turn the toggle state OFF so the UI reflects reality.
			// Other errors (NotFoundError, NotReadableError, etc.) also turn it
			// off — the camera isn't usable regardless of the reason.
			if (err instanceof DOMException && err.name === 'NotAllowedError') {
				console.warn('[useCameraPermission] Camera permission denied by user.')
			} else {
				console.error('[useCameraPermission] Permission request failed:', err)
			}
			hasPermission.value = false
			return false
		}
	}

	/**
	 * Check current permission state without requesting
	 */
	function checkPermission(): boolean {
		return hasPermission.value
	}

	/**
	 * Manually set permission state (for Settings toggle)
	 */
	function setPermission(enabled: boolean): void {
		hasPermission.value = enabled
	}

	/**
	 * Reset permission to default (false)
	 */
	function resetPermission(): void {
		hasPermission.value = false
	}

	return {
		hasPermission,
		requestPermission,
		checkPermission,
		setPermission,
		resetPermission
	}
}
