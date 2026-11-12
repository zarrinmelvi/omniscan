import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { makeThumbDataUri } from './image-thumb'

async function solid(w: number, h: number, extra?: (s: sharp.Sharp) => sharp.Sharp): Promise<Buffer> {
	let s = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } })
	if (extra) s = extra(s)
	return s.jpeg().toBuffer()
}

async function decode(uri: string) {
	const [head, b64] = uri.split(',')
	return { head, meta: await sharp(Buffer.from(b64, 'base64')).metadata() }
}

describe('makeThumbDataUri', () => {
	it('returns a JPEG data URI with long edge <= 320', async () => {
		const uri = await makeThumbDataUri(await solid(1600, 1200))
		expect(uri).not.toBeNull()
		const { head, meta } = await decode(uri!)
		expect(head).toBe('data:image/jpeg;base64')
		expect(meta.format).toBe('jpeg')
		expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(320)
	})

	it('does not enlarge small images and accepts data URIs', async () => {
		const buf = await solid(100, 80)
		const uri = await makeThumbDataUri(`data:image/jpeg;base64,${buf.toString('base64')}`)
		const { meta } = await decode(uri!)
		expect(meta.width).toBe(100)
		expect(meta.height).toBe(80)
	})

	it('returns null (never throws) on bad input', async () => {
		expect(await makeThumbDataUri(Buffer.from('not an image'))).toBeNull()
		expect(await makeThumbDataUri('data:image/jpeg;base64,@@@@')).toBeNull()
		expect(await makeThumbDataUri('')).toBeNull()
		expect(await makeThumbDataUri(null)).toBeNull()
	})

	it('applies EXIF rotation (orientation 6 swaps width and height)', async () => {
		const buf = await solid(400, 200, (s) => s.withMetadata({ orientation: 6 }))
		const { meta } = await decode((await makeThumbDataUri(buf))!)
		expect(meta.height!).toBeGreaterThan(meta.width!)
	})
})
