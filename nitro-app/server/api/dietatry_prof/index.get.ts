import { eventHandler, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async function (event) {
	const query = getQuery(event)

	const take = Number(query?.take) ?? 2
	const skip = Number(query?.skip) ?? 0
	const dietaryProfile = await prisma.dietaryProfile.findMany({
		take,
		skip,
	})

	const dietaryProfileCount = await prisma.dietaryProfile.count()

	return { dietaryProfile, dietaryProfileCount }
})
