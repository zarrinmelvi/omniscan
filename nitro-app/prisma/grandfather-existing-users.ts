/**
 * Grandfather Migration: Mark all pre-existing users as email-verified.
 *
 * Run ONCE after deploying the email-verification feature to production.
 * Any user created before the feature launch date (2026-10-01) who still has
 * email_verified = false is automatically marked as verified so they are not
 * locked out of their existing accounts.
 *
 * Safe to re-run — users already verified are unaffected (updateMany with a
 * WHERE clause means unchanged rows are never touched).
 *
 * Usage:
 *   bunx tsx prisma/grandfather-existing-users.ts
 */

import 'dotenv/config'
import { prisma } from '../server/lib/prisma'

// All users created before this date are considered pre-verification-feature
// accounts and should be grandfathered as verified automatically.
const FEATURE_LAUNCH_DATE = new Date('2026-10-01T00:00:00.000Z')

async function main() {
	console.log('Starting grandfather migration for existing users...')
	console.log(`Grandfathering all unverified users created before ${FEATURE_LAUNCH_DATE.toISOString()}`)

	const result = await prisma.user.updateMany({
		where: {
			email_verified: false,
			created_at: {
				lt: FEATURE_LAUNCH_DATE,
			},
		},
		data: {
			email_verified: true,
			verification_token: null,
			verification_token_expires_at: null,
			last_verification_sent_at: null,
		},
	})

	console.log(`✅ Grandfather migration complete. Updated ${result.count} user(s) to verified status.`)

	if (result.count === 0) {
		console.log('   (No unverified pre-launch users found — either already run or none exist.)')
	}
}

main()
	.catch((err) => {
		console.error('❌ Grandfather migration failed:', err)
		process.exit(1)
	})
	.finally(() => prisma.$disconnect())
