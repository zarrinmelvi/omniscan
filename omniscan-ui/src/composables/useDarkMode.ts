import { ref, watch } from 'vue'
import { DARK_MODE_KEY, resolveInitialDark, writeStoredTheme } from '@/utils/themeStorage'

// Module-level singleton ref — shared across all component instances in the same page.
// Stored choice wins; first-time visitors get the system preference.
const isDark = ref(resolveInitialDark())

function applyTheme(enabled: boolean) {
	document.documentElement.classList.toggle('ion-palette-dark', enabled)
	document.documentElement.classList.toggle('dark', enabled)
	document.body.classList.toggle('dark', enabled)
}

// Apply the classes immediately on module load
applyTheme(isDark.value)

// Keep all DOM target classes in sync and persist right away (sync flush: no delay before navigation)
watch(
	isDark,
	(enabled) => {
		applyTheme(enabled)
		writeStoredTheme(enabled)
	},
	{ flush: 'sync' }
)

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
