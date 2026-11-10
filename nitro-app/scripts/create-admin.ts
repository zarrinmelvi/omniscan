// One-time script to create an admin account. There's no admin
// registration UI (by design — the Admin Portal isn't meant to be
// self-service), so this is how the first (and any future) admin accounts
// get created.
//
// Usage:
//   bun scripts/create-admin.ts <username> <password> "<Full Name>"
//
// Example:
//   bun scripts/create-admin.ts zarrin supersecret123 "Zarrin Delos Santos"
//
// All admins are created with role "admin" and email "omniscan.official@gmail.com".
// The shared email is used for notification delivery (Settings → Notifications).

import bcrypt from 'bcrypt'
import { prisma } from '../server/lib/prisma'

async function main() {
const [username, password, fullName] = process.argv.slice(2)

if (!username || !password || !fullName) {
console.error('Usage: bun scripts/create-admin.ts <username> <password> "<Full Name>"')
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
role: 'admin',
email: 'omniscan.official@gmail.com',
},
})

console.log(`Created admin "${admin.username}" (id ${admin.id}, role "${admin.role}", email "${admin.email}").`)
console.log('You can now log in at /admin/login with this username and the password you just entered.')

await prisma.$disconnect()
}

main().catch(async (err) => {
console.error('Failed to create admin:', err)
await prisma.$disconnect()
process.exit(1)
})
