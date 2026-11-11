// Script to list all admin accounts
//
// Usage:
//   bun scripts/list-admins.ts

import { prisma } from '../server/lib/prisma'

async function main() {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      username: true,
      full_name: true,
      role: true,
      email: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  })

  if (admins.length === 0) {
    console.log('No admin accounts found.')
  } else {
    console.log(`Found ${admins.length} admin account(s):\n`)
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ID: ${admin.id}`)
      console.log(`   Username: ${admin.username}`)
      console.log(`   Full Name: ${admin.full_name}`)
      console.log(`   Role: ${admin.role}`)
      console.log(`   Email: ${admin.email || '(not set)'}`)
      console.log(`   Created: ${admin.created_at}`)
      console.log('')
    })
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Failed to list admins:', err)
  await prisma.$disconnect()
  process.exit(1)
})
