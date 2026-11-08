import { createError, type H3Event } from 'h3'

export function requireAdminAuth(event: H3Event) {
	if (!event.context.admin) {
		if (event.context.authFailureReason === 'session_replaced') {
			throw createError({
				statusCode: 401,
				statusMessage: 'Your account was signed in on another device.',
				data: { reason: 'session_replaced' },
			})
		}
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}
	return event.context.admin
}
