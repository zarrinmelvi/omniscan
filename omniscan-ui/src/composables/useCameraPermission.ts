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
			// Permission denied or error occurred
			console.error('[useCameraPermission] Permission request failed:', err)
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
