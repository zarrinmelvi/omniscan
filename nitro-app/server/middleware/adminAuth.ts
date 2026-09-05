import { defineEventHandler, getHeader } from 'h3'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const isDevelopment = process.env.NODE_ENV === 'development'

interface AdminTokenPayload {
	adminId: number
	username: string
	role: string
	type: 'admin'
}

// Mirrors server/middleware/auth.ts's structure, but populates a separate
// event.context.admin instead of event.context.user — Admin is a completely
// separate table (id/username/role, not email-based), so it gets its own
// context key rather than overloading the user one. Both middleware files
// run on every request; a request can carry a user token, an admin token,
// both, or neither, and each middleware only ever touches its own key.
//
// An admin token is distinguished from a user token by a `type: 'admin'`
// field in the JWT payload (set in admin/login.post.ts) — both are signed
// with the same JWT_SECRET, so this checks payload shape rather than
// needing a second secret.
export default defineEventHandler((event) => {
	event.context.admin = null

	const authHeader = getHeader(event, 'authorization')

	// Dev-only bypass, same shape/warning as auth.ts's — requires an Admin
	// row with id 1 to exist in the local DB for admin routes to actually
	// resolve anything meaningful under this bypass. MUST be disabled in
	// any deployed/production environment.
	if (isDevelopment && !authHeader) {
		console.warn(
			'[DEV BYPASS ACTIVE] No Authorization header — auto-authenticating as admin id 1. ' +
				'This MUST be disabled in any deployed/production environment.',
		)
		event.context.admin = { id: 1, username: 'dev-admin', role: 'admin' }
		return
	}

	if (!JWT_SECRET) {
		console.error('JWT_SECRET is not set — all admin requests will be treated as unauthenticated.')
		return
	}

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return
	}

	const token = authHeader.slice('Bearer '.length).trim()

	if (!token) {
		return
	}

	try {
		const payload = jwt.verify(token, JWT_SECRET) as Partial<AdminTokenPayload>

		// Not an admin token (e.g. a normal user token hitting an admin
		// route) — leave event.context.admin as null rather than trusting it.
		if (payload.type !== 'admin' || typeof payload.adminId !== 'number') {
			return
		}

		event.context.admin = { id: payload.adminId, username: payload.username, role: payload.role }
	} catch (err) {
		event.context.admin = null
	}
})
