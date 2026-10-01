# Design Document: Email Verification

## Overview

This document provides a comprehensive implementation guide for adding email verification to OmniScan's registration flow. The feature prevents fake account creation by requiring users to verify email ownership through a clickable link sent via email, using the Resend API for email delivery.

## Architecture Summary

**Technology Stack:**
- Backend: Nitro (TypeScript)
- Database: PostgreSQL with Prisma ORM
- Email Service: Resend API
- Token Generation: Node.js `crypto` module
- Authentication: JWT (existing pattern)

**Key Components:**
1. Database schema changes to track verification status
2. Modified registration flow with email verification
3. New API endpoints for verification and resending
4. Email service integration with HTML templates
5. Frontend pages for verification flow
6. Scheduled cleanup task for unverified accounts

---

## 1. Resend API Setup

### Step 1: Create Resend Account

1. Visit [https://resend.com/signup](https://resend.com/signup)
2. Create a free account (includes 3,000 emails/month, 100 emails/day)
3. Verify your own email address to activate the account

### Step 2: Get API Key

1. Log into Resend dashboard at [https://resend.com/api-keys](https://resend.com/api-keys)
2. Click **"Create API Key"**
3. Name it: `OmniScan Development` (or `OmniScan Production` for production)
4. Select **"Sending access"** permission
5. Copy the generated API key (starts with `re_`)
6. **Important:** Save this key immediately - you won't be able to see it again

### Step 3: Domain Configuration

**For Development:**
- Use Resend's built-in test domain: `onboarding@resend.dev`
- No DNS configuration required
- Emails will be sent from this address
- Test emails may land in spam - check spam folder

**For Production:**
1. Go to [Resend Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `omniscan.app` (or subdomain: `mail.omniscan.app`)
4. Add the following DNS records to your domain provider:
   - **SPF Record** (TXT): `v=spf1 include:_spf.resend.com ~all`
   - **DKIM Records** (TXT): Provided by Resend (3 records)
   - **DMARC Record** (TXT): `v=DMARC1; p=none`
5. Wait for DNS propagation (up to 48 hours, usually 10-20 minutes)
6. Verify in Resend dashboard that domain status shows "Verified"
7. Update email templates to use: `OmniScan <noreply@omniscan.app>`

### Step 4: Environment Variable Configuration

Add to `nitro-app/.env`:

```bash
# Resend API Configuration
RESEND_API_KEY=re_your_api_key_here

# Email sender (development)
EMAIL_FROM=OmniScan <onboarding@resend.dev>

# Email sender (production - after domain verification)
# EMAIL_FROM=OmniScan <noreply@omniscan.app>

# Frontend URL for verification links
FRONTEND_URL=http://localhost:3000
# FRONTEND_URL=https://omniscan.app (production)
```

**Security Note:** Never commit `.env` file to version control. Ensure it's listed in `.gitignore`.

---

## 2. Database Migration

### Step 1: Update Prisma Schema

Add the following fields to the `User` model in `nitro-app/prisma/schema.prisma`:

```prisma
model User { 
  id    Int     @id @default(autoincrement()) 
  name String 
  email String  @unique 
  password String 
  last_active DateTime
  status String
  avatar_base64 String? 

  // === EMAIL VERIFICATION FIELDS (NEW) ===
  email_verified Boolean @default(false)
  verification_token String? @unique
  verification_token_expires_at DateTime?
  // created_at already exists below, no change needed
  // === END EMAIL VERIFICATION FIELDS ===

  notifications Notification[]
  dietary_prof DietaryProfile[]
  allergens Allergen[] @relation("user_allergens")
  pantry_item PantryItem[]
  scan Scan[]
  activityLog ActivityLog[]
  recipe_interactions RecipeInteraction[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  deleted_at DateTime?
}
```

**Field Explanations:**
- `email_verified`: Boolean flag indicating if the user has verified their email
- `verification_token`: Unique cryptographic token embedded in verification links (nullable, cleared after verification)
- `verification_token_expires_at`: Timestamp when the verification token expires (24 hours from generation)
- `created_at`: Already exists - used for cleanup job to delete old unverified accounts

### Step 2: Create Migration

Run the migration command:

```bash
cd nitro-app
bunx prisma migrate dev --name add_email_verification
```

This will:
1. Generate SQL migration files
2. Apply changes to the database
3. Regenerate Prisma client with updated types

### Step 3: Grandfather Existing Users

Create a migration script: `nitro-app/prisma/migrate-grandfather-users.ts`

```typescript
import { PrismaClient } from '../server/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting grandfather migration for existing users...')
  
  const result = await prisma.user.updateMany({
    where: {
      email_verified: false // Only update users who aren't already verified
    },
    data: {
      email_verified: true,
      verification_token: null,
      verification_token_expires_at: null
    }
  })
  
  console.log(`✓ Grandfathered ${result.count} existing user(s) as verified`)
  console.log('Migration complete!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Run the script after deploying:**

```bash
cd nitro-app
tsx prisma/migrate-grandfather-users.ts
```

**Important:** Run this script ONCE immediately after deploying the migration to production to prevent locking out existing users.

---

## 3. Backend Implementation

### Step 1: Install Dependencies

```bash
cd nitro-app
npm install resend
# crypto is built into Node.js, no installation needed
```

Update `package.json` to include:
```json
{
  "dependencies": {
    "resend": "^4.0.0"
  }
}
```

### Step 2: Create Email Service Module

Create `nitro-app/server/utils/emailService.ts`:

```typescript
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'OmniScan <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not set in environment variables')
}

const resend = new Resend(RESEND_API_KEY)

interface EmailResponse {
  success: boolean
  error?: string
}

/**
 * Send verification email to new user
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<EmailResponse> {
  try {
    const verificationLink = `${FRONTEND_URL}/verify/${token}`
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Verify your OmniScan account',
      html: getVerificationEmailTemplate(name, verificationLink),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log(`✓ Verification email sent to ${email} (ID: ${data?.id})`)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to send verification email:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<EmailResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Welcome to OmniScan!',
      html: getWelcomeEmailTemplate(name),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log(`✓ Welcome email sent to ${email} (ID: ${data?.id})`)
    return { success: true }
  } catch (error: any) {
    console.error('Failed to send welcome email:', error)
    // Don't throw - welcome email failure shouldn't block verification
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * HTML template for verification email
 */
function getVerificationEmailTemplate(name: string, verificationLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your OmniScan Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 3px solid #4CAF50;">
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: bold;">OmniScan</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hi ${name},</h2>
              
              <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Thank you for signing up for OmniScan! Please verify your email address to activate your account and start scanning products.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" style="display: inline-block; padding: 16px 40px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold;">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #555555; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationLink}" style="color: #4CAF50; word-break: break-all;">${verificationLink}</a>
              </p>
              
              <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee; color: #888888; font-size: 14px; line-height: 1.6;">
                <strong>This link expires in 24 hours.</strong> If you need a new verification link, you can request one on the login page.
              </p>
              
              <p style="margin: 20px 0 0 0; color: #888888; font-size: 14px; line-height: 1.6;">
                If you didn't create an account with OmniScan, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f8f8; border-top: 1px solid #eeeeee; text-align: center;">
              <p style="margin: 0; color: #888888; font-size: 12px;">
                © ${new Date().getFullYear()} OmniScan. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * HTML template for welcome email
 */
function getWelcomeEmailTemplate(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OmniScan!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center; border-bottom: 3px solid #4CAF50;">
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: bold;">Welcome to OmniScan! 🎉</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hi ${name},</h2>
              
              <p style="margin: 0 0 20px 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Your email has been successfully verified! You're all set to start using OmniScan to make smarter food choices.
              </p>
              
              <h3 style="margin: 30px 0 15px 0; color: #333333; font-size: 20px;">Quick Start Tips:</h3>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 15px 0;">
                    <div style="display: flex; align-items: start;">
                      <div style="flex-shrink: 0; width: 30px; height: 30px; background-color: #4CAF50; color: white; border-radius: 50%; text-align: center; line-height: 30px; font-weight: bold; margin-right: 15px;">1</div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; color: #333333; font-size: 16px;">Scan Your First Product</h4>
                        <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.5;">Use your camera to scan ingredient labels and get instant safety analysis.</p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <div style="display: flex; align-items: start;">
                      <div style="flex-shrink: 0; width: 30px; height: 30px; background-color: #4CAF50; color: white; border-radius: 50%; text-align: center; line-height: 30px; font-weight: bold; margin-right: 15px;">2</div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; color: #333333; font-size: 16px;">Build Your Pantry</h4>
                        <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.5;">Add items to track expiration dates and reduce food waste.</p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <div style="display: flex; align-items: start;">
                      <div style="flex-shrink: 0; width: 30px; height: 30px; background-color: #4CAF50; color: white; border-radius: 50%; text-align: center; line-height: 30px; font-weight: bold; margin-right: 15px;">3</div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; color: #333333; font-size: 16px;">Get Expiration Reminders</h4>
                        <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.5;">Receive notifications before items expire so you can use them in time.</p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <div style="display: flex; align-items: start;">
                      <div style="flex-shrink: 0; width: 30px; height: 30px; background-color: #4CAF50; color: white; border-radius: 50%; text-align: center; line-height: 30px; font-weight: bold; margin-right: 15px;">4</div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; color: #333333; font-size: 16px;">Discover Recipes</h4>
                        <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.5;">Find recipes that match your pantry items and dietary preferences.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee; color: #555555; font-size: 14px; line-height: 1.6;">
                We're excited to help you on your journey to smarter, healthier food choices!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f8f8; border-top: 1px solid #eeeeee; text-align: center;">
              <p style="margin: 0; color: #888888; font-size: 12px;">
                © ${new Date().getFullYear()} OmniScan. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
```

### Step 3: Create Token Generation Utility

Create `nitro-app/server/utils/tokenUtils.ts`:

```typescript
import crypto from 'crypto'

/**
 * Generate a cryptographically secure verification token
 * Returns a URL-safe base64 string
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Calculate expiration timestamp (24 hours from now)
 */
export function getTokenExpiration(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return new Date() > expiresAt
}
```

### Step 4: Modify Registration Endpoint

Update `nitro-app/server/api/auth/register.post.ts`:

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'
import { sendVerificationEmail } from '../../utils/emailService'
import { generateVerificationToken, getTokenExpiration } from '../../utils/tokenUtils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SALT_ROUNDS = 10

export default defineEventHandler(async (event) => {
	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { name, email, password } = body as { name?: string; email?: string; password?: string }

	// Validation
	if (!name || typeof name !== 'string' || !name.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Name is required.' })
	}
	if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
		throw createError({ statusCode: 400, statusMessage: 'A valid email is required.' })
	}
	if (!password || typeof password !== 'string' || password.length < 6) {
		throw createError({ statusCode: 400, statusMessage: 'Password must be at least 6 characters.' })
	}

	try {
		// Check if user already exists
		const existingUser = await prisma.user.findUnique({ where: { email } })

		if (existingUser) {
			throw createError({ statusCode: 400, statusMessage: 'Email already exists.' })
		}

		// Generate verification token
		const verificationToken = generateVerificationToken()
		const tokenExpiresAt = getTokenExpiration()

		// Send verification email BEFORE creating user
		// If email fails, we don't create the account
		const emailResult = await sendVerificationEmail(email, name.trim(), verificationToken)

		if (!emailResult.success) {
			console.error('Failed to send verification email:', emailResult.error)
			throw createError({ 
				statusCode: 500, 
				statusMessage: 'Unable to send verification email. Please check your email address and try again.' 
			})
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

		// Create user with verification fields
		const newUser = await prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					name: name.trim(),
					email,
					password: hashedPassword,
					status: 'ACTIVE',
					last_active: new Date(),
					email_verified: false,
					verification_token: verificationToken,
					verification_token_expires_at: tokenExpiresAt,
				},
				select: { id: true, name: true, email: true, email_verified: true },
			})

			// Create default dietary profile
			await tx.dietaryProfile.create({
				data: {
					user_id: user.id,
					halal_pref: false,
				},
			})

			return user
		})

		return {
			user: newUser,
			message: 'Registration successful. Please check your email to verify your account.',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		if (err?.code === 'P2002') {
			throw createError({ statusCode: 400, statusMessage: 'Email already exists.' })
		}

		console.error('Registration error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to register user.' })
	}
})
```

### Step 5: Create Verification Endpoint

Create `nitro-app/server/api/auth/verify/[token].get.ts`:

```typescript
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../../lib/prisma'
import { sendWelcomeEmail } from '../../../utils/emailService'
import { isTokenExpired } from '../../../utils/tokenUtils'

export default defineEventHandler(async (event) => {
	const token = getRouterParam(event, 'token')

	if (!token || typeof token !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Verification token is required.' })
	}

	try {
		// Find user by verification token
		const user = await prisma.user.findUnique({
			where: { verification_token: token },
			select: {
				id: true,
				name: true,
				email: true,
				email_verified: true,
				verification_token_expires_at: true,
			},
		})

		if (!user) {
			throw createError({ 
				statusCode: 400, 
				statusMessage: 'This verification link is invalid. Please request a new one.' 
			})
		}

		// Check if already verified
		if (user.email_verified) {
			throw createError({ 
				statusCode: 400, 
				statusMessage: 'This email address is already verified. You can log in now.' 
			})
		}

		// Check if token expired
		if (isTokenExpired(user.verification_token_expires_at)) {
			throw createError({ 
				statusCode: 400, 
				statusMessage: 'This verification link has expired. Please request a new one.' 
			})
		}

		// Update user as verified
		await prisma.user.update({
			where: { id: user.id },
			data: {
				email_verified: true,
				verification_token: null,
				verification_token_expires_at: null,
			},
		})

		// Send welcome email asynchronously (don't wait or block on failure)
		sendWelcomeEmail(user.email, user.name).catch((error) => {
			console.error('Failed to send welcome email (non-blocking):', error)
		})

		return {
			success: true,
			message: 'Email verified successfully! You can now complete your account setup.',
			redirectUrl: '/onboarding/terms', // Redirect to T&C acceptance
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		console.error('Verification error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to verify email.' })
	}
})
```

### Step 6: Create Resend Verification Endpoint

Create `nitro-app/server/api/auth/resend-verification.post.ts`:

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { sendVerificationEmail } from '../../utils/emailService'
import { generateVerificationToken, getTokenExpiration } from '../../utils/tokenUtils'

const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds

export default defineEventHandler(async (event) => {
	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { email } = body as { email?: string }

	if (!email || typeof email !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Email is required.' })
	}

	try {
		// Find user by email
		const user = await prisma.user.findUnique({
			where: { email },
			select: {
				id: true,
				name: true,
				email: true,
				email_verified: true,
				updated_at: true,
			},
		})

		if (!user) {
			// Don't reveal that email doesn't exist for security
			throw createError({ statusCode: 400, statusMessage: 'If this email is registered, a verification link has been sent.' })
		}

		// Check if already verified
		if (user.email_verified) {
			throw createError({ statusCode: 400, statusMessage: 'This email is already verified. You can log in now.' })
		}

		// Check cooldown period (using updated_at as proxy for last email sent)
		const timeSinceLastUpdate = Date.now() - user.updated_at.getTime()
		if (timeSinceLastUpdate < RESEND_COOLDOWN_MS) {
			const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastUpdate) / 1000)
			throw createError({ 
				statusCode: 429, 
				statusMessage: `Please wait ${remainingSeconds} seconds before requesting another email.` 
			})
		}

		// Generate new verification token
		const newToken = generateVerificationToken()
		const tokenExpiresAt = getTokenExpiration()

		// Update user with new token
		await prisma.user.update({
			where: { id: user.id },
			data: {
				verification_token: newToken,
				verification_token_expires_at: tokenExpiresAt,
			},
		})

		// Send new verification email
		const emailResult = await sendVerificationEmail(user.email, user.name, newToken)

		if (!emailResult.success) {
			console.error('Failed to resend verification email:', emailResult.error)
			throw createError({ 
				statusCode: 500, 
				statusMessage: 'Unable to send verification email. Please try again later.' 
			})
		}

		return {
			success: true,
			message: 'Verification email sent! Please check your inbox.',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		console.error('Resend verification error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to resend verification email.' })
	}
})
```

### Step 7: Modify Login Endpoint

Update `nitro-app/server/api/auth/login.post.ts`:

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

export default defineEventHandler(async (event) => {
	if (!JWT_SECRET) {
		console.error('JWT_SECRET is not set in environment variables.')
		throw createError({ statusCode: 500, statusMessage: 'Server misconfiguration.' })
	}

	const body = await readBody(event).catch(() => null)

	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
	}

	const { email, password } = body as { email?: string; password?: string }

	if (!email || typeof email !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Email is required.' })
	}
	if (!password || typeof password !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Password is required.' })
	}

	try {
		const user = await prisma.user.findUnique({ 
			where: { email },
			select: {
				id: true,
				name: true,
				email: true,
				password: true,
				email_verified: true, // NEW: Include verification status
			}
		})

		if (!user) {
			throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
		}

		const isPasswordValid = await bcrypt.compare(password, user.password)

		if (!isPasswordValid) {
			throw createError({ statusCode: 401, statusMessage: 'Invalid email or password.' })
		}

		// NEW: Check email verification status
		if (!user.email_verified) {
			throw createError({ 
				statusCode: 403, 
				statusMessage: 'Please verify your email address. Check your inbox for the verification link.',
				data: { requiresVerification: true } // Flag for frontend to show resend button
			})
		}

		const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
			expiresIn: TOKEN_EXPIRY,
		})

		await prisma.user
			.update({ where: { id: user.id }, data: { last_active: new Date() } })
			.catch((err) => console.error('Failed to update last_active:', err))

		return {
			token,
			user: { id: user.id, name: user.name, email: user.email },
			message: 'Login successful',
		}
	} catch (err: any) {
		if (err?.statusCode) throw err

		console.error('Login error:', err)
		throw createError({ statusCode: 500, statusMessage: 'Failed to log in.' })
	}
})
```

---

## 4. Cleanup Job (Scheduled Task)

### Create Cleanup Task

Create `nitro-app/server/tasks/auth/cleanup-unverified.ts`:

```typescript
import { defineTask } from 'nitropack/runtime'
import { prisma } from '../../lib/prisma'

const CLEANUP_DAYS = 7
const CLEANUP_MS = CLEANUP_DAYS * 24 * 60 * 60 * 1000

export default defineTask({
	meta: {
		name: 'auth:cleanup-unverified',
		description: 'Deletes user accounts that remain unverified for 7 days after registration.',
	},
	async run() {
		const cutoffDate = new Date(Date.now() - CLEANUP_MS)

		try {
			// Find unverified users older than 7 days
			const unverifiedUsers = await prisma.user.findMany({
				where: {
					email_verified: false,
					created_at: {
						lt: cutoffDate,
					},
					deleted_at: null,
				},
				select: {
					id: true,
					email: true,
					name: true,
					created_at: true,
				},
			})

			if (unverifiedUsers.length === 0) {
				console.log('[auth:cleanup-unverified] No unverified accounts to clean up.')
				return { result: 'success', deleted: 0 }
			}

			// Delete unverified accounts
			const userIds = unverifiedUsers.map(u => u.id)

			// Delete related records first (to avoid foreign key constraints)
			await prisma.dietaryProfile.deleteMany({
				where: { user_id: { in: userIds } },
			})

			// Delete users
			const deleteResult = await prisma.user.deleteMany({
				where: {
					id: { in: userIds },
					email_verified: false, // Safety check
				},
			})

			// Log deleted accounts for audit
			console.log('[auth:cleanup-unverified] Deleted unverified accounts:', {
				count: deleteResult.count,
				accounts: unverifiedUsers.map(u => ({
					id: u.id,
					email: u.email,
					name: u.name,
					registeredAt: u.created_at.toISOString(),
				})),
			})

			return {
				result: 'success',
				deleted: deleteResult.count,
				accounts: unverifiedUsers.map(u => u.email),
			}
		} catch (error) {
			console.error('[auth:cleanup-unverified] Error during cleanup:', error)
			return { result: 'error', error: String(error) }
		}
	},
})
```

### Update Nitro Config

Update `nitro-app/nitro.config.ts` to include the new scheduled task:

```typescript
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
	preset: 'vercel',
	compatibilityDate: 'latest',
	srcDir: 'server',
	imports: false,
	experimental: {
		tasks: true,
	},
	scheduledTasks: {
		'0 8 * * *': ['notifications:check-expiring'],
		'0 0 * * *': ['auth:cleanup-unverified'], // Run daily at midnight
	},
	routeRules: {
		'/api/**': {
			cors: true,
		},
	},
})
```

**Schedule Explanation:**
- `'0 0 * * *'`: Runs at 00:00 (midnight) every day
- Cron format: `minute hour day month weekday`

---

## 5. Frontend Implementation

### Component Architecture

```
pages/
├── auth/
│   ├── register.vue (modified)
│   ├── login.vue (modified)
│   ├── check-email.vue (NEW)
│   └── verify/
│       └── [token].vue (NEW)
└── onboarding/
    ├── terms.vue (existing - entry point after verification)
    └── dietary-preferences.vue (existing)
```

### Create CheckEmailPage Component

Create `pages/auth/check-email.vue`:

```vue
<template>
  <div class="check-email-container">
    <div class="check-email-card">
      <!-- Icon -->
      <div class="email-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>

      <!-- Title -->
      <h1 class="title">Check Your Email</h1>

      <!-- Message -->
      <p class="message">
        We've sent a verification link to <strong>{{ userEmail }}</strong>
      </p>

      <p class="message-secondary">
        Click the link in the email to verify your account and complete registration.
      </p>

      <!-- Resend Button -->
      <div class="resend-section">
        <p class="resend-text">Didn't receive the email?</p>
        
        <button 
          @click="handleResend" 
          :disabled="isResending || cooldownRemaining > 0"
          class="resend-button"
        >
          <span v-if="isResending">Sending...</span>
          <span v-else-if="cooldownRemaining > 0">
            Wait {{ cooldownRemaining }}s
          </span>
          <span v-else>Resend verification email</span>
        </button>

        <!-- Success Message -->
        <p v-if="resendSuccess" class="success-message">
          ✓ Verification email sent! Please check your inbox.
        </p>

        <!-- Error Message -->
        <p v-if="resendError" class="error-message">
          {{ resendError }}
        </p>
      </div>

      <!-- Tips -->
      <div class="tips">
        <p class="tips-title">Tips:</p>
        <ul>
          <li>Check your spam or junk folder</li>
          <li>Make sure {{ userEmail }} is correct</li>
          <li>The link expires in 24 hours</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userEmail = ref('')
const isResending = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')
const cooldownRemaining = ref(0)
let cooldownInterval: NodeJS.Timeout | null = null

onMounted(() => {
  // Get email from route query params (set by register page)
  userEmail.value = (router.currentRoute.value.query.email as string) || 'your email'
})

onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})

async function handleResend() {
  if (cooldownRemaining.value > 0) return

  isResending.value = true
  resendSuccess.value = false
  resendError.value = ''

  try {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail.value }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.statusMessage || 'Failed to resend email')
    }

    resendSuccess.value = true
    startCooldown()
  } catch (error: any) {
    resendError.value = error.message || 'Failed to resend verification email'
  } finally {
    isResending.value = false
  }
}

function startCooldown() {
  cooldownRemaining.value = 60

  cooldownInterval = setInterval(() => {
    cooldownRemaining.value--
    if (cooldownRemaining.value <= 0 && cooldownInterval) {
      clearInterval(cooldownInterval)
    }
  }, 1000)
}
</script>

<style scoped>
.check-email-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.check-email-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  text-align: center;
}

.email-icon {
  color: #4CAF50;
  margin-bottom: 20px;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
}

.message {
  font-size: 16px;
  color: #555;
  margin-bottom: 10px;
  line-height: 1.6;
}

.message-secondary {
  font-size: 14px;
  color: #888;
  margin-bottom: 30px;
  line-height: 1.6;
}

.resend-section {
  border-top: 1px solid #eee;
  padding-top: 30px;
  margin-top: 30px;
}

.resend-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 15px;
}

.resend-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.resend-button:hover:not(:disabled) {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.resend-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  transform: none;
}

.success-message {
  margin-top: 15px;
  color: #4CAF50;
  font-size: 14px;
  font-weight: 500;
}

.error-message {
  margin-top: 15px;
  color: #f44336;
  font-size: 14px;
  font-weight: 500;
}

.tips {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  text-align: left;
}

.tips-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.tips ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.tips li {
  font-size: 13px;
  color: #666;
  line-height: 1.8;
}
</style>
```

### Create Verify Email Page

Create `pages/auth/verify/[token].vue`:

```vue
<template>
  <div class="verify-container">
    <div class="verify-card">
      <!-- Loading State -->
      <div v-if="isVerifying" class="state loading">
        <div class="spinner"></div>
        <h1>Verifying your email...</h1>
        <p>Please wait while we confirm your email address.</p>
      </div>

      <!-- Success State -->
      <div v-else-if="verificationSuccess" class="state success">
        <div class="icon success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h1>Email Verified!</h1>
        <p>Your email has been successfully verified. Redirecting to complete your account setup...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="state error">
        <div class="icon error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h1>Verification Failed</h1>
        <p class="error-text">{{ errorMessage }}</p>

        <!-- Show resend button for expired/invalid tokens -->
        <div v-if="showResendOption" class="resend-section">
          <button @click="handleResend" :disabled="isResending" class="resend-button">
            {{ isResending ? 'Sending...' : 'Request new verification link' }}
          </button>

          <p v-if="resendSuccess" class="success-message">
            ✓ Verification email sent! Please check your inbox.
          </p>

          <p v-if="resendError" class="error-text">
            {{ resendError }}
          </p>
        </div>

        <!-- Login button if already verified -->
        <div v-else class="action-section">
          <button @click="goToLogin" class="action-button">
            Go to Login
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const isVerifying = ref(true)
const verificationSuccess = ref(false)
const errorMessage = ref('')
const showResendOption = ref(false)
const isResending = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')
const userEmail = ref('')

onMounted(async () => {
  const token = route.params.token as string

  if (!token) {
    errorMessage.value = 'Invalid verification link.'
    isVerifying.value = false
    return
  }

  await verifyEmail(token)
})

async function verifyEmail(token: string) {
  try {
    const response = await fetch(`/api/auth/verify/${token}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.statusMessage || 'Verification failed')
    }

    verificationSuccess.value = true
    
    // Redirect to Terms & Conditions after 2 seconds
    setTimeout(() => {
      router.push(data.redirectUrl || '/onboarding/terms')
    }, 2000)
  } catch (error: any) {
    errorMessage.value = error.message
    
    // Determine if we should show resend option
    const errorText = error.message.toLowerCase()
    if (errorText.includes('expired') || errorText.includes('invalid')) {
      showResendOption.value = true
    }
  } finally {
    isVerifying.value = false
  }
}

async function handleResend() {
  // Get email from user input (you may want to add an email input field)
  // For now, prompt the user
  const email = prompt('Please enter your email address to resend verification:')
  
  if (!email) return

  isResending.value = true
  resendSuccess.value = false
  resendError.value = ''

  try {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.statusMessage || 'Failed to resend email')
    }

    resendSuccess.value = true
  } catch (error: any) {
    resendError.value = error.message || 'Failed to resend verification email'
  } finally {
    isResending.value = false
  }
}

function goToLogin() {
  router.push('/auth/login')
}
</script>

<style scoped>
.verify-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.verify-card {
  background: white;
  border-radius: 12px;
  padding: 60px 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  text-align: center;
}

.state h1 {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.state p {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
}

/* Loading State */
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
  margin: 0 auto 30px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Success/Error Icons */
.icon {
  margin-bottom: 20px;
}

.success-icon {
  color: #4CAF50;
}

.error-icon {
  color: #f44336;
}

.error-text {
  color: #f44336;
}

.success-message {
  margin-top: 15px;
  color: #4CAF50;
  font-size: 14px;
  font-weight: 500;
}

/* Buttons */
.resend-section,
.action-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.resend-button,
.action-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.resend-button:hover:not(:disabled),
.action-button:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.resend-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
```

### Modify Registration Page

Update `pages/auth/register.vue` to redirect to check-email page after successful registration:

```vue
<!-- In the registration success handler -->
<script setup lang="ts">
// ... existing code ...

async function handleRegister() {
  // ... existing validation ...

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.statusMessage || 'Registration failed')
    }

    // NEW: Redirect to check-email page instead of dietary preferences
    router.push({
      path: '/auth/check-email',
      query: { email: formData.email }
    })
  } catch (error: any) {
    errorMessage.value = error.message || 'Registration failed. Please try again.'
  }
}
</script>
```

### Modify Login Page

Update `pages/auth/login.vue` to handle unverified users:

```vue
<template>
  <div class="login-container">
    <!-- ... existing login form ... -->

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-box">
      <p>{{ errorMessage }}</p>

      <!-- NEW: Show resend button for unverified users -->
      <button 
        v-if="requiresVerification" 
        @click="handleResendVerification"
        :disabled="isResending"
        class="resend-link"
      >
        {{ isResending ? 'Sending...' : 'Resend verification email' }}
      </button>
    </div>

    <!-- Success Message for Resend -->
    <div v-if="resendSuccess" class="success-box">
      ✓ Verification email sent! Please check your inbox.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const formData = ref({ email: '', password: '' })
const errorMessage = ref('')
const requiresVerification = ref(false) // NEW
const isResending = ref(false) // NEW
const resendSuccess = ref(false) // NEW

async function handleLogin() {
  errorMessage.value = ''
  requiresVerification.value = false
  resendSuccess.value = false

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value),
    })

    const data = await response.json()

    if (!response.ok) {
      // NEW: Check if error is due to unverified email
      if (response.status === 403 && data.data?.requiresVerification) {
        requiresVerification.value = true
      }
      throw new Error(data.statusMessage || 'Login failed')
    }

    // Store token and redirect
    localStorage.setItem('authToken', data.token)
    router.push('/dashboard')
  } catch (error: any) {
    errorMessage.value = error.message
  }
}

// NEW: Handle resend verification
async function handleResendVerification() {
  isResending.value = true
  resendSuccess.value = false

  try {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.value.email }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.statusMessage || 'Failed to resend email')
    }

    resendSuccess.value = true
    errorMessage.value = '' // Clear error message
  } catch (error: any) {
    errorMessage.value = error.message
  } finally {
    isResending.value = false
  }
}
</script>

<style scoped>
/* ... existing styles ... */

.error-box {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
}

.success-box {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 500;
}

.resend-link {
  background: none;
  border: none;
  color: #1976d2;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
}

.resend-link:disabled {
  color: #999;
  cursor: not-allowed;
}
</style>
```

---

## 6. Testing Checklist

### Manual Testing Steps

**1. Registration Flow:**
- [ ] Register with a valid email - should redirect to check-email page
- [ ] Check inbox for verification email within 1-2 minutes
- [ ] Verify email contains user's name and verification link
- [ ] Verify link expires in 24 hours (shown in email)
- [ ] Try registering with same email - should show error

**2. Verification Link:**
- [ ] Click verification link - should redirect to Terms & Conditions
- [ ] Try using same link again - should show "already verified" error
- [ ] Register new account, wait 24+ hours, click expired link - should show expiration error

**3. Login Restriction:**
- [ ] Register account but don't verify email
- [ ] Try logging in - should be blocked with error message
- [ ] Verify email, then login - should succeed

**4. Resend Functionality:**
- [ ] Click "Resend verification email" on check-email page
- [ ] Verify new email arrives
- [ ] Try clicking resend again immediately - should show cooldown timer
- [ ] Wait 60 seconds, click resend - should work

**5. Welcome Email:**
- [ ] Verify email address
- [ ] Check inbox for welcome email
- [ ] Verify it contains quick start tips
- [ ] Verify no CTA buttons (informational only)

**6. Existing Users (Migration):**
- [ ] Run grandfather migration script
- [ ] Existing users should be able to log in without verification
- [ ] Check database: existing users have email_verified = true

**7. Cleanup Job:**
- [ ] Create test account without verifying
- [ ] Fast-forward system time by 7+ days (or wait)
- [ ] Run cleanup task manually: `nitro task run auth:cleanup-unverified`
- [ ] Verify unverified account was deleted
- [ ] Verify verified accounts remain untouched

**8. Error Handling:**
- [ ] Try registering with invalid email format - should show validation error
- [ ] Try registering when Resend API is down (simulate by using invalid API key) - should show email sending error
- [ ] Try verifying with invalid token - should show appropriate error

### Automated Testing (Optional)

Create `nitro-app/tests/auth-verification.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PrismaClient } from '../server/generated/prisma'

describe('Email Verification', () => {
  const prisma = new PrismaClient()

  it('should create user with email_verified = false', async () => {
    // Test logic here
  })

  it('should generate unique verification token', async () => {
    // Test logic here
  })

  it('should expire token after 24 hours', async () => {
    // Test logic here
  })

  // Add more tests...
})
```

---

## 7. Deployment Checklist

### Pre-Deployment

- [ ] Set RESEND_API_KEY in production environment variables
- [ ] Verify domain in Resend dashboard (if using custom domain)
- [ ] Update EMAIL_FROM to production sender address
- [ ] Update FRONTEND_URL to production URL
- [ ] Test Resend API connection in production environment
- [ ] Review email templates for branding accuracy

### Deployment Steps

1. **Deploy Database Migration:**
   ```bash
   cd nitro-app
   bunx prisma migrate deploy
   ```

2. **Run Grandfather Migration:**
   ```bash
   tsx prisma/migrate-grandfather-users.ts
   ```

3. **Deploy Application Code:**
   - Deploy backend changes (API endpoints, email service)
   - Deploy frontend changes (new pages, modified components)
   - Deploy scheduled task (cleanup job)

4. **Verify Deployment:**
   - Test registration with real email
   - Verify emails are received
   - Test complete verification flow
   - Check logs for errors

### Post-Deployment Monitoring

- [ ] Monitor Resend dashboard for email delivery metrics
- [ ] Check application logs for email sending errors
- [ ] Monitor cleanup job logs daily
- [ ] Track bounce/complaint rates in Resend
- [ ] Watch for user support tickets related to verification

---

## 8. Troubleshooting Guide

### Common Issues

**Emails Not Sending:**
- Check RESEND_API_KEY is set correctly
- Verify API key permissions in Resend dashboard
- Check Resend account is active and within daily limit (100 emails/day free tier)
- Review error logs: `console.error` messages from emailService.ts

**Emails Going to Spam:**
- Verify domain SPF/DKIM/DMARC records are set up
- Use verified domain instead of onboarding@resend.dev
- Ask users to check spam folder and mark as "Not Spam"

**Token Expiration Issues:**
- Verify server timezone is correct
- Check verification_token_expires_at is being set properly
- Ensure isTokenExpired() function compares timestamps correctly

**Resend Cooldown Not Working:**
- Verify user.updated_at is being updated on resend
- Check cooldown calculation in resend endpoint
- Clear browser cache if testing multiple times

**Cleanup Job Not Running:**
- Verify scheduledTasks is configured in nitro.config.ts
- Check server logs for task execution
- Manually run task: `nitro task run auth:cleanup-unverified`
- Ensure experimental.tasks is enabled in Nitro config

---

## 9. Security Considerations

**Token Security:**
- Tokens are generated using crypto.randomBytes(32) - cryptographically secure
- Tokens are unique and unpredictable (base64url encoding)
- Tokens expire after 24 hours
- Tokens are single-use (cleared after verification)

**Rate Limiting:**
- 60-second cooldown on resend requests prevents email spam
- Consider adding IP-based rate limiting for additional protection

**Email Privacy:**
- Don't reveal whether an email exists in the system during resend
- Use generic error messages for security

**Database Security:**
- Verification tokens are indexed for performance
- No sensitive data in email templates
- Use parameterized queries (Prisma) to prevent SQL injection

---

## 10. Future Enhancements

**Potential Improvements:**

1. **Email Customization:**
   - Admin dashboard to customize email templates
   - Multi-language support for email content
   - Add company logo dynamically

2. **Advanced Features:**
   - SMS verification as alternative to email
   - Social auth providers (Google, Apple) bypass verification
   - Magic link login (passwordless)

3. **Analytics:**
   - Track verification completion rates
   - Monitor email delivery success rates
   - A/B test email templates

4. **User Experience:**
   - Progressive disclosure: let users explore app before verification
   - Reminder emails for unverified accounts (before deletion)
   - Visual verification progress indicator

---

## References

- [Resend Documentation](https://resend.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Nitro Scheduled Tasks](https://nitro.unjs.io/guide/tasks)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- Requirements Document: `.kiro/specs/email-verification/requirements.md`

---

## Appendix: Environment Variables Summary

```bash
# Backend (.env in nitro-app/)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=OmniScan <noreply@omniscan.app>
FRONTEND_URL=https://omniscan.app
JWT_SECRET=your_existing_jwt_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/omniscan
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-26  
**Status:** Ready for Implementation
