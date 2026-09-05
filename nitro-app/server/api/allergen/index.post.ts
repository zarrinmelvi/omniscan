import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	const allergen = await prisma.allergen.create({
		data: test.users[0],
	})
	return allergen
})
