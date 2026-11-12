/**
 * Single source of truth for the password strength rules enforced everywhere
 * a password is set or changed: registration, profile "change password", and
 * the forgot-password reset flow.
 *
 * Rules: 10-30 characters AND at least one uppercase letter, one lowercase
 * letter, one number, and one special (non-alphanumeric) character. The
 * upper bound of 30 also keeps every password well under bcrypt's 72-byte
 * truncation limit, so the full input is always hashed.
 */

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 30

const PASSWORD_RE = new RegExp(
	'^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{' + PASSWORD_MIN + ',' + PASSWORD_MAX + '}$',
)

/**
 * Validates a password against the strength policy.
 * @returns `null` when the password is acceptable, otherwise a human-readable
 * reason string suitable for surfacing to the client as a 400 statusMessage.
 */
export function validatePassword(password: unknown): string | null {
	if (typeof password !== 'string' || !password) {
		return 'Password is required.'
	}
	if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
		return `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`
	}
	if (!PASSWORD_RE.test(password)) {
		return 'Password must contain an uppercase letter, a lowercase letter, a number, and a special character.'
	}
	return null
}
