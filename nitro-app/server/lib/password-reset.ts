import crypto from 'crypto'

/** Minimum gap between two reset emails for the same account. */
export const RESET_COOLDOWN_SECONDS = 30

/**
 * Short fingerprint of the user's current password hash. It is embedded in the
 * reset token (`pwf` claim), so the link stops working as soon as the password
 * changes. That makes every reset link single-use without storing extra state.
 * Accounts without a local password (Google-only) fingerprint the empty string.
 */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
	return crypto.createHash('sha256').update(passwordHash ?? '').digest('hex').slice(0, 24)
}

/**
 * Seconds the caller still has to wait before another reset email may be sent.
 * Returns 0 when a new request is allowed.
 */
export function resetCooldownRemaining(lastRequestedAt: Date | null | undefined, now: Date = new Date()): number {
	if (!lastRequestedAt) return 0
	const elapsedSeconds = (now.getTime() - lastRequestedAt.getTime()) / 1000
	if (elapsedSeconds < 0) return RESET_COOLDOWN_SECONDS
	const remaining = Math.ceil(RESET_COOLDOWN_SECONDS - elapsedSeconds)
	return remaining > 0 ? remaining : 0
}

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isWellFormedEmail(email: string): boolean {
	return email.length <= 254 && EMAIL_FORMAT_RE.test(email)
}
