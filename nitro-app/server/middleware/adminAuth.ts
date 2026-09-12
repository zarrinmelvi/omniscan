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

export default defineEventHandler((event) => {
	event.context.admin = null

	const authHeader = getHeader(event, 'authorization')

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

		if (payload.type !== 'admin' || typeof payload.adminId !== 'number') {
			return
		}

		event.context.admin = { id: payload.adminId, username: payload.username, role: payload.role }
	} catch (err) {
		event.context.admin = null
	}
})
