import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	const notification = await prisma.notification.create({
		data: test.notification[0],
	})
	return notification
})
