import sharp from 'sharp'

/**
 * Build a small JPEG data URI thumbnail (long edge <= maxEdge) from a Buffer
 * or a `data:` URI / raw base64 string. Applies EXIF rotation, never enlarges.
 * Returns null on any failure; never throws.
 */
export async function makeThumbDataUri(
	input: Buffer | string | null | undefined,
	maxEdge = 320,
	quality = 70,
): Promise<string | null> {
	try {
		if (!input) return null
		let buf: Buffer
		if (typeof input === 'string') {
			const comma = input.startsWith('data:') ? input.indexOf(',') : -1
			const b64 = comma >= 0 ? input.slice(comma + 1) : input
			buf = Buffer.from(b64, 'base64')
		} else {
			buf = input
		}
		if (buf.length === 0) return null
		const out = await sharp(buf)
			.rotate()
			.resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality })
			.toBuffer()
		return `data:image/jpeg;base64,${out.toString('base64')}`
	} catch {
		return null
	}
}
