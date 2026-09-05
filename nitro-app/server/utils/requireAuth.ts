import { createError, type H3Event } from 'h3'

export function requireAuth(event: H3Event) {
	if (!event.context.user) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}
	return event.context.user
}
