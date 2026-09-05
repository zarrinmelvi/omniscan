// One-time script to create an admin account. There's no admin
// registration UI (by design — the Admin Portal isn't meant to be
// self-service), so this is how the first (and any future) admin accounts
// get created.
//
// Usage:
//   bun scripts/create-admin.ts <username> <password> "<Full Name>" [role]
//
// Example:
//   bun scripts/create-admin.ts zarrin supersecret123 "Zarrin Delos Santos" superadmin
//
// role defaults to "admin" if omitted.

import bcrypt from 'bcrypt'
import { prisma } from '../server/lib/prisma'

async function main() {
	const [username, password, fullName, role] = process.argv.slice(2)

	if (!username || !password || !fullName) {
		console.error('Usage: bun scripts/create-admin.ts <username> <password> "<Full Name>" [role]')
		process.exit(1)
	}

	const existing = await prisma.admin.findUnique({ where: { username } })
	if (existing) {
		console.error(`An admin with username "${username}" already exists (id ${existing.id}).`)
		await prisma.$disconnect()
		process.exit(1)
	}

	const hashedPassword = await bcrypt.hash(password, 10)

	const admin = await prisma.admin.create({
		data: {
			username,
			password: hashedPassword,
			full_name: fullName,
			role: role || 'admin',
		},
	})

	console.log(`Created admin "${admin.username}" (id ${admin.id}, role "${admin.role}").`)
	console.log('You can now log in at /admin/login with this username and the password you just entered.')

	await prisma.$disconnect()
}

main().catch(async (err) => {
	console.error('Failed to create admin:', err)
	await prisma.$disconnect()
	process.exit(1)
})
