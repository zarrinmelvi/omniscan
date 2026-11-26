import sharp from 'sharp'

/** Gemini-style box: [ymin, xmin, ymax, xmax], normalized 0–1000. */
export type LogoBox = [number, number, number, number]

const PAD_RATIO = 0.08
const MAX_SIDE = 256

export interface LogoQuality {
	blurry: boolean
	glare: boolean
}

/**
 * Analyses a cropped logo buffer for two image quality problems:
 *
 * - **blurry**: applies a Laplacian edge-detection kernel and measures the
 *   variance of the resulting pixel values. A sharp image has lots of
 *   high-contrast edges (high variance); a blurry one does not.
 *   Threshold is empirically set at 200 — below this the text in the logo
 *   is unlikely to be legible to the AI or to OCR.
 *
 * - **glare**: reads per-channel stats via sharp. A mean brightness > 220
 *   combined with a low standard deviation across the whole crop means the
 *   image is overexposed / washed out.
 *
 * Never throws — returns { blurry: false, glare: false } on any failure so
 * the calling scan route is never broken by a quality-check error.
 */
export async function analyseLogoQuality(cropBuffer: Buffer): Promise<LogoQuality> {
	try {
		// ── Blur detection via Laplacian variance ─────────────────────────────
		// The Laplacian kernel amplifies edges. In a sharp image, edge pixels
		// have large absolute values → high variance. In a blurry image, edges
		// are smoothed away → low variance.
		const BLUR_VARIANCE_THRESHOLD = 200

		const laplacianRaw = await sharp(cropBuffer)
			.greyscale()
			.convolve({
				width: 3,
				height: 3,
				kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
			})
			.raw()
			.toBuffer()

		// Compute variance of the Laplacian pixel values.
		const n = laplacianRaw.length
		let sum = 0
		for (let i = 0; i < n; i++) sum += laplacianRaw[i]
		const mean = sum / n
		let variance = 0
		for (let i = 0; i < n; i++) {
			const diff = laplacianRaw[i] - mean
			variance += diff * diff
		}
		variance /= n
		const blurry = variance < BLUR_VARIANCE_THRESHOLD

		// ── Glare detection via channel statistics ────────────────────────────
		// sharp.stats() returns mean and stdev per channel on a 0–255 scale.
		// Overexposed / glare-affected images have a very high mean brightness
		// and a low standard deviation (most pixels are blown out to white).
		const GLARE_MEAN_THRESHOLD = 220
		const GLARE_STDEV_THRESHOLD = 30

		const stats = await sharp(cropBuffer).stats()
		// Use the dominant (highest mean) channel as the brightness signal.
		const maxMean = Math.max(...stats.channels.map((c) => c.mean))
		const minStdev = Math.min(...stats.channels.map((c) => c.stdev))
		const glare = maxMean > GLARE_MEAN_THRESHOLD && minStdev < GLARE_STDEV_THRESHOLD

		return { blurry, glare }
	} catch (err) {
		console.error('[logo-crop] analyseLogoQuality failed (non-blocking):', err)
		return { blurry: false, glare: false }
	}
}

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
