import { defineEventHandler, createError, getHeader } from 'h3'
import { sendSystemErrorNotification } from '../../utils/email'
import { prisma } from '../../lib/prisma'

export default defineEventHandler(async (event) => {
const authHeader = getHeader(event, 'authorization')
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
}

const admin = await prisma.admin.findFirst({
where: { email: { not: null } },
select: { email: true, full_name: true },
})

const result = await sendSystemErrorNotification({
context: 'Demo — System Error Alert',
message: 'Sample system error notification for the capstone defense demo.',
})

return { success: true, result, recipientEmail: admin?.email ?? null }
})
