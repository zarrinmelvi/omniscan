// Cleanup Endpoint: Soft-delete pantry items that have been archived for 7+ days.
//
// Schedule this endpoint to run daily via Vercel Cron Jobs (vercel.json):
//   { "path": "/api/cron/cleanup-archived", "schedule": "0 8 * * *" }
//
// Authorization: Bearer <CRON_SECRET> header required.

import { defineEventHandler, createError, getHeader } from 'h3'
import { prisma } from '../../lib/prisma'

const ARCHIVED_RETENTION_DAYS = 7

export default defineEventHandler(async (event) => {
const authHeader = getHeader(event, 'authorization')
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
}

const cutoff = new Date()
cutoff.setDate(cutoff.getDate() - ARCHIVED_RETENTION_DAYS)

// Find archived items whose updated_at is older than 7 days and not yet soft-deleted
const itemsToDelete = await prisma.pantryItem.findMany({
where: {
is_archived: true,
deleted_at: null,
updated_at: { lt: cutoff },
},
select: { id: true },
})

if (itemsToDelete.length === 0) {
console.log('[cleanup-archived] No archived items eligible for deletion.')
return { result: 'success', deleted: 0 }
}

const ids = itemsToDelete.map((item) => item.id)

const now = new Date()
const deleted = await prisma.pantryItem.updateMany({
where: { id: { in: ids } },
data: { deleted_at: now },
})

console.log(`[cleanup-archived] Soft-deleted ${deleted.count} archived pantry item(s) older than ${ARCHIVED_RETENTION_DAYS} days.`)

return { result: 'success', deleted: deleted.count }
})