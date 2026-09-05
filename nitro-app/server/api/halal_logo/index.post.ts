import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	const halalLogo = await prisma.halalLogo.create({
		data: test.halalLogo[0],
	})
	return halalLogo
})
