import { eventHandler, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const test = await readBody(event)

	//return test
	const admin = await prisma.admin.update({
		data: {
			allergens: {
				set: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
			},
		},
		where: {
			id: test.id,
		},
	})
	return admin
})

/**
 * user: 1
 *
 * allergens: [1,2,3,4,5]
 *
 *
 * allergens: [1,2]
 *
 *
 *
 */
