import { defineEventHandler, createError, getHeader } from 'h3'
import { sendSystemErrorNotification } from '../../utils/email'
import { sendDailySummaryNotification } from '../../utils/email'
import { sendMonthlyLogoCheckNotification } from '../../utils/email'
import { prisma } from '../../lib/prisma'

export default defineEventHandler(async (event) => {
const authHeader = getHeader(event, 'authorization')
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
}

// Fix the admin email in DB first
await prisma.admin.updateMany({
where: {},
data: { email: 'omniscan.official@gmail.com' },
})

const admin = await prisma.admin.findFirst({ select: { email: true } })

return { success: true, updatedEmail: admin?.email }
})
