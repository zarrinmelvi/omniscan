import { ref, watch } from 'vue'

const DARK_MODE_KEY = 'omniscan_dark_mode'

// Module-level singleton ref — shared across all component instances in the same page.
const isDark = ref(localStorage.getItem(DARK_MODE_KEY) === 'true')

// Apply the class immediately on module load (so the initial state is applied as early as possible).
document.documentElement.classList.toggle('ion-palette-dark', isDark.value)

// Keep the DOM class in sync whenever isDark changes.
watch(isDark, (enabled) => {
  document.documentElement.classList.toggle('ion-palette-dark', enabled)
  localStorage.setItem(DARK_MODE_KEY, String(enabled))
})

// Sync across browser tabs via the storage event.
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
