import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	const dietaryProfile = await prisma.dietaryProfile.create({
		data: test.dietaryProfile[0],
	})
	return dietaryProfile
})
