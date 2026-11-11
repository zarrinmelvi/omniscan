/**
 * expiryReminders.ts
 *
 * Pure, framework-agnostic logic for computing a local-notification reminder
 * plan from a list of expiring pantry items.  No Capacitor imports here —
 * this module is testable in isolation and imported by `reminderScheduler.ts`
 * which handles the actual scheduling side-effects.
 */

export interface ReminderItem {
	/** PantryItem id (from the API) */
	id: number
	/** Product name (displayed in the notification body) */
	name: string
	/** Expiry / best-before date as an ISO string */
	date: string
}

export interface ReminderPlanEntry {
	/**
	 * Deterministic local-notification id derived from the pantry item id
	 * and the days-before offset.  Formula: `itemId * 10 + daysBefore`
	 * (daysBefore is 1 or 3, so ids never collide for different items).
	 */
	id: number
	/** PantryItem id this reminder belongs to */
	itemId: number
	/** Product name shown in the notification body */
	itemName: string
	/** How many days before expiry this reminder fires (3 or 1) */
	daysBefore: number
	/** The exact Date at which the notification should fire */
	at: Date
}

const MAX_REMINDERS = 60
/** 9 AM local time — reminders always fire in the morning. */
const REMINDER_HOUR = 9
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Build a list of local-notification reminders for the given pantry items.
 *
 * For each item, up to two reminders are generated:
 *   - 3 days before expiry, at 9 AM local time
 *   - 1 day before expiry, at 9 AM local time
 *
 * Only reminders whose scheduled time is still in the future (relative to
 * `now`) are included.  The total is sorted by scheduled time (soonest first)
 * and capped at 60 entries to stay within local-notification limits.
 *
 * @param items  Items expiring within the 4-day window (from the API)
 * @param now    Reference "current" time (injectable for testing)
 */
export function buildReminderPlan(items: ReminderItem[], now: Date = new Date()): ReminderPlanEntry[] {
	const reminders: ReminderPlanEntry[] = []

	for (const item of items) {
		const expiryDate = new Date(item.date)
		if (isNaN(expiryDate.getTime())) continue

		// Exact day boundary so we don't schedule a 3-day-reminder for an
		// item that expires in 2 days 23 hours.
		const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / DAY_MS)

		for (const daysBefore of [3, 1]) {
			// Skip this reminder if the item expires too soon for it to fire
			// (e.g. a 3-day-reminder for an item expiring tomorrow).
			if (daysUntilExpiry < daysBefore) continue

			// Compute the reminder date: expiry date minus N days, at 9 AM.
			const reminderDate = new Date(expiryDate)
			reminderDate.setDate(reminderDate.getDate() - daysBefore)
			reminderDate.setHours(REMINDER_HOUR, 0, 0, 0)

			// Only schedule if the reminder is still in the future.
			if (reminderDate.getTime() > now.getTime()) {
				reminders.push({
					id: item.id * 10 + daysBefore,
					itemId: item.id,
					itemName: item.name,
					daysBefore,
					at: reminderDate,
				})
			}
		}
	}

	// Sort by scheduled time (soonest first) so the cap keeps the most urgent.
	reminders.sort((a, b) => a.at.getTime() - b.at.getTime())
	return reminders.slice(0, MAX_REMINDERS)
}
