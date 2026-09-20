import { defineEventHandler, createError, getHeader } from 'h3'
import { runTask } from 'nitropack/runtime'

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
	}

	const result = await runTask('notifications:check-expiring')
	return { success: true, result }
})
