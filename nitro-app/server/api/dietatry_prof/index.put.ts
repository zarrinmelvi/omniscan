import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	//return test
	const dietaryProfile = await prisma.dietaryProfile.update({
		data: test,
		where: {
			id: test.id,
		},
	})
	return dietaryProfile
})
