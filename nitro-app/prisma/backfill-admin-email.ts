/**
 * Backfill: Set the admin email on the primary admin account.
 *
 * Sets email = 'delossantoszarrinmelvi@gmail.com' on the admin whose
 * username = 'zarrin' (only where email is currently null, so re-running
 * is safe and won't clobber a manually-set value).
 *
 * Run with:  tsx prisma/backfill-admin-email.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../server/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = `${process.env.DIRECT_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const TARGET_USERNAME = 'zarrin'
const TARGET_EMAIL = 'delossantoszarrinmelvi@gmail.com'

async function main() {
	console.log(`Backfilling admin email for username "${TARGET_USERNAME}"...\n`)

	const result = await prisma.admin.updateMany({
		where: { username: TARGET_USERNAME, email: null },
		data: { email: TARGET_EMAIL },
	})

	console.log(`  → Updated ${result.count} admin row(s) with email "${TARGET_EMAIL}".`)

	if (result.count === 0) {
		console.log(
			`  (No rows updated — either no admin named "${TARGET_USERNAME}" exists, ` +
				`or the email was already set.)`,
		)
	}

	console.log(`\nDone.`)
}

main()
	.then(async () => {
		await prisma.$disconnect()
		process.exit(0)
	})
	.catch(async (e) => {
		console.error('Backfill failed:', e)
		await prisma.$disconnect()
		process.exit(1)
	})
