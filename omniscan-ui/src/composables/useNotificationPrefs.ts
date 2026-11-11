import { ref } from 'vue'
import { apiFetch } from '@/utils/api'

/**
 * useNotificationPrefs — single source of truth for the user's notification
 * preference (the "expiry reminders" toggle on the Settings page).
 *
 * The server-side `push_notifications_enabled` column on the User model is
 * the authoritative value.  This composable loads it from GET /api/users and
 * persists changes via PUT /api/users.
 *
 * Legacy migration: the old app stored the toggle in localStorage under
 * `omniscan_pref_notifications`.  On the first load after this composable is
 * introduced, that localStorage value is pushed to the server and the key is
 * removed — a one-time sync so users don't lose their previous choice.
 */

/** Legacy localStorage key (pre-API era). */
const NOTIF_PREF_KEY = 'omniscan_pref_notifications'

// Module-level singleton refs — shared across every component that calls
// useNotificationPrefs(), so the Settings page, reminder scheduler, and any
// other consumer all read the same value.
const notificationsEnabled = ref(true)
const loaded = ref(false)

export function useNotificationPrefs() {
	/**
	 * Load the preference from the server (GET /api/users).
	 *
	 * If the legacy localStorage key still exists, its value is pushed to
	 * the server first (one-time migration), then the key is removed.
	 */
	async function loadPrefs(): Promise<void> {
		// ── One-time legacy sync from localStorage ────────────────────────
		const legacyValue = localStorage.getItem(NOTIF_PREF_KEY)
		if (legacyValue !== null) {
			const enabled = legacyValue !== 'false'
			try {
				await apiFetch('/api/users', {
					method: 'PUT',
					body: { push_notifications_enabled: enabled },
				})
			} catch {
				// Non-critical — the GET below will provide the server value,
				// which defaults to true for every account.
			}
			// Remove the legacy key so this migration only happens once.
			localStorage.removeItem(NOTIF_PREF_KEY)
		}

		// ── Load the authoritative value from the server ─────────────────
		try {
			const data = await apiFetch<{ user: { push_notifications_enabled?: boolean } }>('/api/users', {
				method: 'GET',
			})
			notificationsEnabled.value = data.user?.push_notifications_enabled ?? true
		} catch {
			// If the server is unreachable, keep the default (true).
			notificationsEnabled.value = true
		}

		loaded.value = true
	}

	/**
	 * Persist the preference to the server (PUT /api/users) and update the
	 * local ref.  Called when the user toggles the notification switch.
	 */
	async function savePrefs(enabled: boolean): Promise<void> {
		notificationsEnabled.value = enabled
		try {
			await apiFetch('/api/users', {
				method: 'PUT',
				body: { push_notifications_enabled: enabled },
			})
		} catch (err) {
			console.error('[useNotificationPrefs] Failed to save preference:', err)
		}
	}

	return { notificationsEnabled, loaded, loadPrefs, savePrefs }
}
