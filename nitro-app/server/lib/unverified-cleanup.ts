// Pure selection logic for deleting stale unverified sign-ups.
// Only password accounts that never verified their email and are older than
// UNVERIFIED_ACCOUNT_RETENTION_DAYS are selected. Verified, Google-linked and
// younger accounts are never selected.

export const UNVERIFIED_ACCOUNT_RETENTION_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export interface UnverifiedCandidate {
	id: number
	email_verified: boolean
	oauth_provider: string | null
	created_at: Date
}

/** Cutoff date: accounts created strictly before this are eligible. */
export function getUnverifiedCutoff(now: Date = new Date()): Date {
	return new Date(now.getTime() - UNVERIFIED_ACCOUNT_RETENTION_DAYS * DAY_MS)
}

export function selectUnverifiedAccountsForDeletion<T extends UnverifiedCandidate>(
	users: T[],
	now: Date = new Date(),
): T[] {
	const cutoff = getUnverifiedCutoff(now).getTime()
	return users.filter(
		(u) =>
			u.email_verified === false &&
			(u.oauth_provider === null || u.oauth_provider === undefined) &&
			u.created_at.getTime() < cutoff,
	)
}
