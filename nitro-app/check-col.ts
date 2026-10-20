import 'dotenv/config'
import { PrismaClient } from "./server/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
const pool = new Pool({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const rows: any = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'PantryItem' AND column_name = 'saved_alternatives'")
console.log("COLUMN_EXISTS:" + (rows.length > 0))
await prisma.$disconnect()
process.exit(0)
