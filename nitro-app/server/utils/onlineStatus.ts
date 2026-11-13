// Online = has a live session AND was active within this window.
export const ONLINE_WINDOW_MS = 2 * 60 * 1000

export function onlineSince(now: Date): Date {
	return new Date(now.getTime() - ONLINE_WINDOW_MS)
}

export function onlineWhere(now: Date) {
	return { session_token: { not: null }, last_active: { gte: onlineSince(now) } }
}

export function isOnline(
	user: { session_token?: string | null; last_active?: Date | null },
	now: Date,
): boolean {
	return (
		!!user.session_token &&
		user.last_active != null &&
		user.last_active.getTime() >= now.getTime() - ONLINE_WINDOW_MS
	)
}
