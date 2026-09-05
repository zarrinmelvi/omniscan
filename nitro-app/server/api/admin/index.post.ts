import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	const admin = await prisma.admin.create({
		data: test.admin[0],
	})
	return admin
})
