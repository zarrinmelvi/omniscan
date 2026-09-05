import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	const user = await prisma.user.create({
		data: test.users[0],
	})
	return user
})
