import { defineEventHandler, createError, getHeader } from 'h3'
import { sendSystemErrorNotification } from '../../utils/email'
import { prisma } from '../../lib/prisma'

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	if (process.env.CRON_SECRET) {
		if (authHeader !== Bearer ) {
			throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
		}
	}

	const result = await sendSystemErrorNotification({
		context: 'Demo - System Error Alert',
		message: 'The server detected 3 consecutive slow requests on the /api/scan endpoint.',
	})

	return { success: true, result }
})
