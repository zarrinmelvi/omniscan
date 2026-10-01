// TEMPORARY DEBUG ENDPOINT — remove after diagnosing email issue
// Usage: GET /api/debug/email-test?to=youremail@gmail.com

import { defineEventHandler, getQuery, createError } from 'h3'
import { Resend } from 'resend'

export default defineEventHandler(async (event) => {
const query = getQuery(event)
const to = query.to as string

if (!to) {
throw createError({ statusCode: 400, statusMessage: 'Missing ?to= param' })
}

const apiKey = process.env.RESEND_API_KEY
const emailFrom = process.env.EMAIL_FROM
const frontendUrl = process.env.FRONTEND_URL

const envReport = {
RESEND_API_KEY: apiKey ? `set (starts with ${apiKey.slice(0, 6)}...)` : 'MISSING',
EMAIL_FROM: emailFrom || 'MISSING',
FRONTEND_URL: frontendUrl || 'MISSING',
}

if (!apiKey) {
return { success: false, env: envReport, error: 'RESEND_API_KEY is not set in environment' }
}

try {
const resend = new Resend(apiKey)
const { data, error } = await resend.emails.send({
from: emailFrom || 'OmniScan <onboarding@resend.dev>',
to,
subject: 'OmniScan Email Test',
html: '<p>This is a test email. If you see this, Resend is working.</p>',
})

if (error) {
return { success: false, env: envReport, resendError: error }
}

return { success: true, env: envReport, emailId: data?.id }
} catch (err: any) {
return { success: false, env: envReport, thrown: err?.message }
}
})
