import { createError, type H3Event } from 'h3'

export function requireAdminAuth(event: H3Event) {
	if (!event.context.admin) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
	}
	return event.context.admin
}
