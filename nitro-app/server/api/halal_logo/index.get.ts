import { eventHandler, getQuery } from 'h3'
import { prisma } from '../../lib/prisma'

export default eventHandler(async function (event) {
	const query = getQuery(event)

	const take = Number(query?.take) ?? 2
	const skip = Number(query?.skip) ?? 0

	const halalLogo = await prisma.halalLogo.findMany({ take, skip })
	const halalLogoCount = await prisma.halalLogo.count()

	// image_path in the DB is a relative path like "reference-logos/jakim.svg".
	// The SVG assets are bundled into the omniscan-ui frontend's /public folder,
	// so they are reachable at /<image_path> from the admin portal's own origin.
	// We also normalise legacy .png extensions to .svg so old DB rows still work.
	const mapped = halalLogo.map((logo) => ({
		...logo,
		// logo_src is the path the browser should use for <img :src="...">
		// It is always relative so it works on any deployment domain.
		logo_src: logo.image_path
			? '/' + logo.image_path.replace(/\.png$/i, '.svg')
			: null,
	}))

	return { halalLogo: mapped, halalLogoCount }
})
