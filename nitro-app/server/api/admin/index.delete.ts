import { eventHandler, getQuery, readBody } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async (event) => {
	const query = getQuery(event)

	const admin = await prisma.admin.delete({
		where: {
			id: Number(query.id),
		},
	})
	return admin
})
