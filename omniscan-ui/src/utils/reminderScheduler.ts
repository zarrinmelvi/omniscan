/**
 * reminderScheduler.ts
 *
 * Coordinates local-notification scheduling for pantry expiry reminders.
 *
 * `syncExpiryReminders()`  — fetches expiring items from the API, builds a
 *   reminder plan, cancels any previously-scheduled notifications, and
 *   schedules the new set.  Respects the user's notification preference
 *   toggle; if notifications are OFF it cancels everything and returns.
 *
 * `cancelAllReminders()`  — cancels every pending local notification.  Called
 *   on logout and when the notification toggle is turned OFF.
 *
 * Both functions are no-ops on web — they only act on native platforms.
 * The LocalNotifications plugin is imported dynamically to avoid bundling
 * it into the web build.
 */

import { Capacitor } from '@capacitor/core'
import { apiFetch } from '@/utils/api'
import { buildReminderPlan, type ReminderItem } from '@/utils/expiryReminders'
import { useNotificationPrefs } from '@/composables/useNotificationPrefs'

/**
 * Cancel every pending local notification.  Safe to call on web (no-op).
 */
export async function cancelAllReminders(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return
	try {
		const { LocalNotifications } = await import('@capacitor/local-notifications')
		const pending = await LocalNotifications.getPending()
		if (pending.notifications.length > 0) {
			await LocalNotifications.cancel({
				notifications: pending.notifications.map((n) => ({ id: n.id })),
			})
		}
	} catch (err) {
		console.error('[reminderScheduler] Failed to cancel reminders:', err)
	}
}

/**
 * Synchronise local notifications with the user's current pantry state.
 *
 * Flow:
 *  1. If the notification toggle is OFF → cancel all and return.
 *  2. Cancel any previously-scheduled reminders.
 *  3. Fetch expiring items from GET /api/pantry_item/reminders.
 *  4. Build the reminder plan (9 AM, 3-day and 1-day before, cap 60).
 *  5. Request notification permission if not already granted.
 *  6. Schedule the new reminders.
 *
 * Should be called on: app login, foreground resume, pantry changes, and
 * notification toggle changes (when turned ON).
 */
export async function syncExpiryReminders(): Promise<void> {
	if (!Capacitor.isNativePlatform()) return

	// Respect the user's notification preference — if OFF, cancel everything.
	const { notificationsEnabled } = useNotificationPrefs()
	if (!notificationsEnabled.value) {
		await cancelAllReminders()
		return
	}

	try {
		const { LocalNotifications } = await import('@capacitor/local-notifications')

		// ── 1. Cancel all previously-scheduled reminders ──────────────────
		const pending = await LocalNotifications.getPending()
		if (pending.notifications.length > 0) {
			await LocalNotifications.cancel({
				notifications: pending.notifications.map((n) => ({ id: n.id })),
			})
		}

		// ── 2. Fetch expiring items from the API ──────────────────────────
		const data = await apiFetch<{ success: boolean; items: ReminderItem[] }>(
			'/api/pantry_item/reminders',
			{ method: 'GET' },
		)

		// ── 3. Build the reminder plan ─────────────────────────────────────
		const plan = buildReminderPlan(data.items, new Date())
		if (plan.length === 0) return

		// ── 4. Request permission if not yet granted ───────────────────────
		const permStatus = await LocalNotifications.checkPermissions()
		if (permStatus.display !== 'granted') {
			const reqStatus = await LocalNotifications.requestPermissions()
			if (reqStatus.display !== 'granted') return
		}

		// ── 5. Schedule the new reminders ────────────────────────────────
		await LocalNotifications.schedule({
			notifications: plan.map((r) => ({
				id: r.id,
				title: 'Expiring Soon',
				body: `${r.itemName} expires in ${r.daysBefore} day${r.daysBefore === 1 ? '' : 's'}.`,
				schedule: { at: r.at },
				smallIcon: 'ic_stat_notification',
			})),
		})

		console.log(`[reminderScheduler] Scheduled ${plan.length} expiry reminder(s).`)
	} catch (err) {
		console.error('[reminderScheduler] Failed to sync expiry reminders:', err)
	}
}
