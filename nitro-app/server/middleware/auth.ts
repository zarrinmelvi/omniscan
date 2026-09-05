import { defineEventHandler, getHeader } from 'h3'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
const isDevelopment = process.env.NODE_ENV === 'development'

interface AuthTokenPayload {
	userId: number
	email: string
}

export default defineEventHandler((event) => {
	event.context.user = null

	const authHeader = getHeader(event, 'authorization')

	// Dev-only bypass — only fires when NODE_ENV=development AND no
	// Authorization header was sent at all. A real token always goes
	// through normal verification below.
	if (isDevelopment && !authHeader) {
		console.warn(
			'[DEV BYPASS ACTIVE] No Authorization header — auto-authenticating as user id 1. ' +
				'This MUST be disabled in any deployed/production environment.',
		)
		event.context.user = { id: 1, email: 'dev@test.com' }
		return
	}

	if (!JWT_SECRET) {
		console.error('JWT_SECRET is not set — all requests will be treated as unauthenticated.')
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
		const payload = jwt.verify(token, JWT_SECRET) as AuthTokenPayload
		event.context.user = { id: payload.userId, email: payload.email }
	} catch (err) {
		event.context.user = null
	}
})
