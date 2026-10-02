import { defineEventHandler, createError, getHeader, getQuery } from 'h3'
import { runTask } from 'nitropack/runtime'

export default defineEventHandler(async (event) => {
	const authHeader = getHeader(event, 'authorization')
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
	}

	const query = getQuery(event)
	const force = query.force === '1' || query.force === 'true'

	const result = await runTask('notifications:daily-summary', { payload: { force } })
	return { success: true, result }
})
