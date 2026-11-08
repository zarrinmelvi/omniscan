import sharp from 'sharp'

/** Gemini-style box: [ymin, xmin, ymax, xmax], normalized 0–1000. */
export type LogoBox = [number, number, number, number]

const PAD_RATIO = 0.08
const MAX_SIDE = 256

/**
 * Crops the Halal logo region out of an uploaded image and returns a PNG data URI
 * (max 256px). Never throws: returns null on any failure so a scan is never broken.
 */
export async function cropLogo(image: Buffer | string, box: LogoBox): Promise<string | null> {
	try {
		const raw = typeof image === 'string'
			? Buffer.from(image.replace(/^data:[^;]+;base64,/, ''), 'base64')
			: image

		// Bake in EXIF orientation first so pixel dimensions match what the model saw.
		const buffer = await sharp(raw).rotate().toBuffer()
		const { width, height } = await sharp(buffer).metadata()
		if (!width || !height) return null

		const [ymin, xmin, ymax, xmax] = box
		const boxW = ((xmax - xmin) / 1000) * width
		const boxH = ((ymax - ymin) / 1000) * height

		const left = Math.max(0, Math.floor((xmin / 1000) * width - boxW * PAD_RATIO))
		const top = Math.max(0, Math.floor((ymin / 1000) * height - boxH * PAD_RATIO))
		const right = Math.min(width, Math.ceil((xmax / 1000) * width + boxW * PAD_RATIO))
		const bottom = Math.min(height, Math.ceil((ymax / 1000) * height + boxH * PAD_RATIO))

		const cropW = right - left
		const cropH = bottom - top
		if (cropW < 1 || cropH < 1) return null

		const out = await sharp(buffer)
			.extract({ left, top, width: cropW, height: cropH })
			.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
			.png()
			.toBuffer()

		return `data:image/png;base64,${out.toString('base64')}`
	} catch (err) {
		console.error('[logo-crop] Failed to crop logo (non-blocking):', err)
		return null
	}
}
