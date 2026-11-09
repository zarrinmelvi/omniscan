import { ref, watch } from 'vue'

const DARK_MODE_KEY = 'omniscan_dark_mode'

// Module-level singleton ref — shared across all component instances in the same page.
const isDark = ref(localStorage.getItem(DARK_MODE_KEY) === 'true')

function applyTheme(enabled: boolean) {
	document.documentElement.classList.toggle('ion-palette-dark', enabled)
	document.documentElement.classList.toggle('dark', enabled)
	document.body.classList.toggle('dark', enabled)
}

// Apply the classes immediately on module load
applyTheme(isDark.value)

// Keep all DOM target classes in sync whenever isDark changes
watch(isDark, (enabled) => {
	applyTheme(enabled)
	localStorage.setItem(DARK_MODE_KEY, String(enabled))
})

// Sync across browser tabs via the storage event
window.addEventListener('storage', (e) => {
	if (e.key === DARK_MODE_KEY) {
		isDark.value = e.newValue === 'true'
	}
})

export function useDarkMode() {
	function toggle() {
		isDark.value = !isDark.value
	}

	function set(enabled: boolean) {
		isDark.value = enabled
	}

	return { isDark, toggle, set }
}