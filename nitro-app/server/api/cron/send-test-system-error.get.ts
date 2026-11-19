import { defineEventHandler, createError, getHeader } from 'h3'
import { sendSystemErrorNotification } from '../../utils/email'

export default defineEventHandler(async (event) => {
const authHeader = getHeader(event, 'authorization')
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
}

const result = await sendSystemErrorNotification({
context: 'Demo — System Error Alert',
message: 'This is a sample system error notification triggered for the capstone defense demo. The OmniScan server detected 3 consecutive slow requests on the /api/scan endpoint.',
})

return { success: true, result }
})
