import { defineEventHandler, createError, getHeader } from 'h3'
import { sendSystemErrorNotification } from '../../utils/email'

export default defineEventHandler(async (event) => {
	const auth = getHeader(event, 'authorization')
	const secret = process.env.CRON_SECRET
	if (secret) { if (auth !== 'Bearer ' + secret) { throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' }) } }

	const result = await sendSystemErrorNotification({
		context: 'Demo - System Error Alert',
		message: 'The server detected 3 consecutive slow requests on the /api/scan endpoint.',
	})

	return { success: true, result }
})
