/**
 * appBadge.ts
 *
 * Thin wrapper around the @capawesome/capacitor-badge plugin that manages
 * the app launcher icon badge (unread-notification count).
 *
 * All functions are no-ops on web — they only act on native platforms.
 * The Badge plugin is imported dynamically so it is never bundled into the
 * web build.
 */

import { Capacitor } from '@capacitor/core'
import { apiFetch } from '@/utils/api'

/**
 * Set the app badge to a specific count.  A count of 0 clears the badge.
 */
export async function setBadge(count: number): Promise<void> {
	if (!Capacitor.isNativePlatform()) return
	try {
		const { Badge } = await import('@capawesome/capacitor-badge')
		if (count > 0) {
			await Badge.set({ count })
		} else {
			await Badge.clear()
		}
	} catch (err) {
		console.error('[appBadge] setBadge failed:', err)
	}
}

/**
 * Clear the app badge (set to 0).
 */
export async function clearBadge(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return
	try {
		const { Badge } = await import('@capawesome/capacitor-badge')
		await Badge.clear()
	} catch (err) {
		console.error('[appBadge] clearBadge failed:', err)
	}
}

/**
 * Fetch the current unread-notification count from the server and update
 * the app badge accordingly.  Returns the count so callers can also update
 * any in-memory ref they use for display.
 *
 * Used by App.vue on foreground resume and can be used anywhere the badge
 * needs refreshing without going through AppHeader's fetchUnreadNotifs.
 */
export async function refreshNotifBadge(): Promise<number> {
	try {
		const res = await apiFetch<{ success: boolean; unread_count: number }>('/api/notification', {
			method: 'GET',
		})
		const count = res.unread_count || 0
		await setBadge(count)
		return count
	} catch {
		await clearBadge()
		return 0
	}
}
