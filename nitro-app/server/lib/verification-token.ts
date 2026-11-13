import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

// Username rules mirror register.post.ts (4-15 chars, letters/numbers/underscore).
const USERNAME_RE = /^[a-zA-Z0-9_]{4,15}$/

function randomToken(): string {
	return randomBytes(32).toString('base64url')
}

/**
 * Creates an email verification token. When a username and JWT_SECRET are
 * available, the token is a signed JWT carrying the pending username so the
 * username is only persisted after verification. Otherwise a plain random token.
 * No `exp` claim: expiry is tracked in verification_token_expires_at.
 */
export function createVerificationToken(username?: string | null): string {
	const secret = process.env.JWT_SECRET
	if (!secret || !username) return randomToken()
	return jwt.sign({ t: 'verify', u: username, n: randomBytes(16).toString('hex') }, secret)
}

/** Returns the pending username from a validly signed verification token, else null. */
export function readPendingUsername(token: string | null | undefined): string | null {
	const secret = process.env.JWT_SECRET
	if (!secret || !token || typeof token !== 'string') return null
	try {
		const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any
		if (payload && payload.t === 'verify' && typeof payload.u === 'string' && USERNAME_RE.test(payload.u)) {
			return payload.u
		}
		return null
	} catch {
		return null
	}
}
