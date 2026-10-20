import { defineEventHandler, sendRedirect, createError } from 'h3'
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, GOOGLE_AUTH_URL, isGoogleOAuthConfigured } from '../../../lib/oauth'

export default defineEventHandler(async (event) => {
	if (!isGoogleOAuthConfigured()) {
		throw createError({ statusCode: 503, statusMessage: 'Google sign-in is not configured on this server yet.' })
	}
	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: GOOGLE_REDIRECT_URI,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline',
		prompt: 'select_account',
	})
	return sendRedirect(event, `${GOOGLE_AUTH_URL}?${params.toString()}`)
})
