import crypto from 'crypto'
import { Resend } from 'resend'
import { getAdminSettings } from '../lib/admin-settings'
import { prisma } from '../lib/prisma'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'OmniScan <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

const resend = new Resend(RESEND_API_KEY)

interface EmailResult {
	success: boolean
	error?: string
}

export function generateVerificationToken(): string {
	return crypto.randomBytes(32).toString('base64url')
}

export async function sendVerificationEmail(
	email: string,
	name: string,
	token: string
): Promise<EmailResult> {
	const verificationUrl = `${FRONTEND_URL}/verify/${token}`

	try {
		const { error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: email,
			subject: 'Verify your OmniScan email',
			html: buildVerificationEmailHtml(name, verificationUrl),
		})

		if (error) {
			console.error('[email] Resend API error (verification):', error)
			return { success: false, error: error.message }
		}

		console.log(`[email] Verification email sent to ${email}`)
		return { success: true }
	} catch (err: any) {
		console.error('[email] Failed to send verification email:', err)
		return { success: false, error: err?.message ?? 'Unknown error' }
	}
}

export async function sendWelcomeEmail(email: string, name: string): Promise<EmailResult> {
	try {
		const { error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: email,
			subject: 'Welcome to OmniScan!',
			html: buildWelcomeEmailHtml(name),
		})

		if (error) {
			console.error('[email] Resend API error (welcome):', error)
			return { success: false, error: error.message }
		}

		console.log(`[email] Welcome email sent to ${email}`)
		return { success: true }
	} catch (err: any) {
		console.error('[email] Failed to send welcome email:', err)
		return { success: false, error: err?.message ?? 'Unknown error' }
	}
}

function buildVerificationEmailHtml(name: string, verificationUrl: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your OmniScan email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;border-bottom:3px solid #4CAF50;text-align:center;">
              <h1 style="margin:0;font-size:26px;color:#333333;">OmniScan</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:18px;color:#333333;">Hi ${name},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
                Thanks for signing up! Please verify your email address to activate your account
                and start scanning products.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td>
                    <a href="${verificationUrl}"
                       style="display:inline-block;padding:14px 36px;background-color:#4CAF50;color:#ffffff;
                              text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#777777;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 32px;font-size:13px;">
                <a href="${verificationUrl}" style="color:#4CAF50;word-break:break-all;">${verificationUrl}</a>
              </p>

              <p style="margin:0;padding-top:24px;border-top:1px solid #eeeeee;font-size:13px;color:#999999;line-height:1.6;">
                <strong>This link expires in 24 hours.</strong> You can request a new one from the login page.<br />
                If you didn't create an OmniScan account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8f8f8;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                &copy; ${new Date().getFullYear()} OmniScan. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildWelcomeEmailHtml(name: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to OmniScan!</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;border-bottom:3px solid #4CAF50;text-align:center;">
              <h1 style="margin:0;font-size:26px;color:#333333;">Welcome to OmniScan! 🎉</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:18px;color:#333333;">Hi ${name},</p>
              <p style="margin:0 0 32px;font-size:15px;color:#555555;line-height:1.6;">
                Your email is verified and your account is ready. Here are a few tips to help
                you get the most out of OmniScan:
              </p>

              <!-- Tips -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#333333;">
                      🥗 Set your allergens / allergy list
                    </p>
                    <p style="margin:0;font-size:14px;color:#666666;line-height:1.5;">
                      Tell OmniScan about your allergies and if you want Halal verified food products so every scan is personalized to you.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#333333;">
                      📷 Scan food product or stock foods
                    </p>
                    <p style="margin:0;font-size:14px;color:#666666;line-height:1.5;">
                      Point your camera at any food products: package name and ingredient labels for an instant safety analysis.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#333333;">
                      🛒 Build your pantry
                    </p>
                    <p style="margin:0;font-size:14px;color:#666666;line-height:1.5;">
                      Add scanned items to your pantry to track expiration dates and reduce food waste.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#333333;">
                      🍳 Discover recipes
                    </p>
                    <p style="margin:0;font-size:14px;color:#666666;line-height:1.5;">
                      Find recipes that match what's already in your pantry — less waste, more delicious meals.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #eeeeee;
                         font-size:13px;color:#999999;line-height:1.6;">
                Happy scanning!<br />The OmniScan Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8f8f8;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                &copy; ${new Date().getFullYear()} OmniScan. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Resolve the admin email that notification emails should be delivered to.
 * Picks the first admin that has a non-null email set. Returns null if no
 * admin has an email configured yet (callers must handle this gracefully).
 */
async function resolveAdminRecipient(): Promise<{ email: string; full_name: string } | null> {
	try {
		const admin = await prisma.admin.findFirst({
			where: { email: { not: null } },
			select: { email: true, full_name: true },
		})
		if (!admin || !admin.email) return null
		return { email: admin.email, full_name: admin.full_name }
	} catch (err) {
		console.error('[email] Failed to resolve admin recipient:', err)
		return null
	}
}

/**
 * Notify the admin when a new scan is auto-flagged. Gated by the
 * `emailOnNewFlag` admin setting — if the toggle is off, nothing is sent.
 * Defensive: never throws, always returns an EmailResult.
 */
export async function sendNewFlagNotification(details: {
	productName: string
	flagReason: string
	scannedBy?: string
}): Promise<EmailResult> {
	try {
		const settings = await getAdminSettings()
		if (!settings.emailOnNewFlag) {
			return { success: false, error: 'disabled' }
		}

		const recipient = await resolveAdminRecipient()
		if (!recipient) {
			console.warn('[email] New-flag notification skipped — no admin email configured.')
			return { success: false, error: 'no admin email' }
		}

		const { error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: recipient.email,
			subject: `🚩 New flag: ${details.productName}`,
			html: buildNewFlagEmailHtml(details),
		})

		if (error) {
			console.error('[email] Resend API error (new flag):', error)
			return { success: false, error: error.message }
		}

		console.log(`[email] New-flag notification sent to ${recipient.email}`)
		return { success: true }
	} catch (err: any) {
		console.error('[email] Failed to send new-flag notification:', err)
		return { success: false, error: err?.message ?? 'Unknown error' }
	}
}

/**
 * Notify the admin about a server-side system error. Gated by the
 * `emailOnSystemError` admin setting — if the toggle is off, nothing is sent.
 * Defensive: never throws, always returns an EmailResult.
 */
export async function sendSystemErrorNotification(details: {
	context: string
	message: string
}): Promise<EmailResult> {
	try {
		const settings = await getAdminSettings()
		if (!settings.emailOnSystemError) {
			return { success: false, error: 'disabled' }
		}

		const recipient = await resolveAdminRecipient()
		if (!recipient) {
			console.warn('[email] System-error notification skipped — no admin email configured.')
			return { success: false, error: 'no admin email' }
		}

		const { error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: recipient.email,
			subject: `⚠️ System error: ${details.context}`,
			html: buildSystemErrorEmailHtml(details),
		})

		if (error) {
			console.error('[email] Resend API error (system error):', error)
			return { success: false, error: error.message }
		}

		console.log(`[email] System-error notification sent to ${recipient.email}`)
		return { success: true }
	} catch (err: any) {
		console.error('[email] Failed to send system-error notification:', err)
		return { success: false, error: err?.message ?? 'Unknown error' }
	}
}

function buildNewFlagEmailHtml(details: { productName: string; flagReason: string; scannedBy?: string }): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New flag: ${details.productName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;border-bottom:3px solid #E53935;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#333333;">🚩 New Flagged Scan</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Product</p>
              <p style="margin:0 0 20px;font-size:17px;font-weight:bold;color:#333333;">${details.productName}</p>

              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Flag reason</p>
              <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6;">${details.flagReason}</p>

              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Scanned by</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;">${details.scannedBy ?? 'Unknown'}</p>

              <p style="margin:0;padding-top:24px;border-top:1px solid #eeeeee;font-size:13px;color:#999999;line-height:1.6;">
                You are receiving this because "Email on New Flag" is enabled in Admin Settings.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8f8f8;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                &copy; ${new Date().getFullYear()} OmniScan. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildSystemErrorEmailHtml(details: { context: string; message: string }): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System error: ${details.context}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;border-bottom:3px solid #FB8C00;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#333333;">⚠️ System Error</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Context</p>
              <p style="margin:0 0 20px;font-size:17px;font-weight:bold;color:#333333;">${details.context}</p>

              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Message</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">${details.message}</p>

              <p style="margin:0;padding-top:24px;border-top:1px solid #eeeeee;font-size:13px;color:#999999;line-height:1.6;">
                You are receiving this because "Email on System Error" is enabled in Admin Settings.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8f8f8;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                &copy; ${new Date().getFullYear()} OmniScan. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Send the admin a daily summary of newly flagged scans. Gated by the
 * `dailySummaryReport` admin setting — if the toggle is off, nothing is sent.
 * Defensive: never throws, always returns an EmailResult.
 */
export async function sendDailySummaryNotification(details: {
	periodLabel: string
	totalFlags: number
	byStatus: { pending: number; approved: number; dismissed: number; other: number }
	topFlags: { productName: string; flagReason: string; verdict: string | null }[]
}): Promise<EmailResult> {
	try {
		const settings = await getAdminSettings()
		if (!settings.dailySummaryReport) {
			return { success: false, error: 'disabled' }
		}

		const recipient = await resolveAdminRecipient()
		if (!recipient) {
			console.warn('[email] Daily-summary notification skipped — no admin email configured.')
			return { success: false, error: 'no admin email' }
		}

		const { error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: recipient.email,
			subject: `Daily summary: ${details.totalFlags} new flag(s) — ${details.periodLabel}`,
			html: buildDailySummaryEmailHtml(details),
		})

		if (error) {
			console.error('[email] Resend API error (daily summary):', error)
			return { success: false, error: error.message }
		}

		console.log(`[email] Daily-summary notification sent to ${recipient.email}`)
		return { success: true }
	} catch (err: any) {
		console.error('[email] Failed to send daily-summary notification:', err)
		return { success: false, error: err?.message ?? 'Unknown error' }
	}
}

function buildDailySummaryEmailHtml(details: {
	periodLabel: string
	totalFlags: number
	byStatus: { pending: number; approved: number; dismissed: number; other: number }
	topFlags: { productName: string; flagReason: string; verdict: string | null }[]
}): string {
	const topFlagsRows =
		details.topFlags.length > 0
			? details.topFlags
					.map(
						(f) => `
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#333333;">
                      ${f.productName}${f.verdict ? ` <span style="font-size:12px;font-weight:normal;color:#777777;">(${f.verdict})</span>` : ''}
                    </p>
                    <p style="margin:0;font-size:14px;color:#666666;line-height:1.5;">${f.flagReason}</p>
                  </td>
                </tr>`
					)
					.join('')
			: `
                <tr>
                  <td style="padding:12px 0;">
                    <p style="margin:0;font-size:14px;color:#999999;">No new flags in this period. 🎉</p>
                  </td>
                </tr>`

	const dashboardUrl = `${FRONTEND_URL}/admin/verification`
	const generatedAt = new Date().toLocaleString('en-US', {
		timeZone: 'UTC',
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily summary: ${details.periodLabel}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;border-bottom:3px solid #1E88E5;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#333333;">Daily Summary Report</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Period</p>
              <p style="margin:0 0 20px;font-size:15px;color:#555555;">${details.periodLabel}</p>

              <p style="margin:0 0 8px;font-size:14px;color:#777777;">New flags</p>
              <p style="margin:0 0 24px;font-size:28px;font-weight:bold;color:#1E88E5;">${details.totalFlags}</p>

              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Status breakdown</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555555;">Pending</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:bold;color:#333333;text-align:right;">${details.byStatus.pending}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555555;">Approved</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:bold;color:#333333;text-align:right;">${details.byStatus.approved}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555555;">Dismissed</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:bold;color:#333333;text-align:right;">${details.byStatus.dismissed}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555555;">Other</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:bold;color:#333333;text-align:right;">${details.byStatus.other}</td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#777777;">Recent flags</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${topFlagsRows}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td align="center" style="border-radius:6px;background-color:#008744;">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">
                      View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;padding-top:24px;border-top:1px solid #eeeeee;font-size:13px;color:#999999;line-height:1.6;">
                You are receiving this because "Daily Summary Report" is enabled in Admin Settings.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f8f8f8;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#aaaaaa;">
                Generated ${generatedAt} UTC
              </p>
              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                &copy; ${new Date().getFullYear()} OmniScan. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
