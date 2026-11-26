/**
 * Light image pre-processing to improve AI scan accuracy.
 *
 * Applied after resizeImageForUpload and before the image is POSTed to the
 * scan API. The transforms are intentionally conservative — they sharpen text
 * and logo edges without distorting colours or introducing artefacts that
 * would confuse the vision model.
 *
 * Pipeline (in order):
 *   1. Contrast + saturation boost via CSS filter on the canvas context.
 *      Increases the separation between ink and background, making ingredient
 *      text and Halal logo marks more legible to the AI OCR pass.
 *   2. Unsharp-mask sharpening via a 3×3 ImageData convolution kernel.
 *      Recovers the edge detail that JPEG compression flattens during resize.
 *
 * Always falls back to the original file on any error so a pre-processing
 * failure can never block a scan.
 */

// How strongly the sharpening kernel is applied.
// 0 = no sharpening, 1 = full kernel weight. Keep low (< 0.4) to avoid
// haloing artefacts on compressed images.
const SHARPEN_AMOUNT = 0.3

// Output quality for the processed JPEG. Slightly higher than the resize
// quality (0.85) to preserve the sharpening work.
const OUTPUT_QUALITY = 0.88

/**
 * Applies contrast enhancement and unsharp-mask sharpening to `file`.
 * Returns a new File with the same name on success, or the original file
 * unchanged if the browser environment doesn't support the required APIs
 * or if any step throws.
 */
export async function preprocessForUpload(file: File): Promise<File> {
	if (!file.type.startsWith('image/')) return file

	try {
		// ── Load image into a bitmap ──────────────────────────────────────────
		let source: CanvasImageSource
		let width: number
		let height: number
		let releaseBitmap: () => void = () => {}

		if (typeof createImageBitmap === 'function') {
			const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
			source = bmp
			width = bmp.width
			height = bmp.height
			releaseBitmap = () => bmp.close()
		} else {
			const url = URL.createObjectURL(file)
			const img = new Image()
			img.decoding = 'async'
			img.src = url
			await img.decode()
			URL.revokeObjectURL(url)
			source = img
			width = img.naturalWidth
			height = img.naturalHeight
		}

		if (width < 1 || height < 1) return file

		try {
			// ── Step 1: contrast + saturation boost ───────────────────────────
			// CSS filter is applied by the 2D context before drawing, so the
			// enhanced pixels land directly in the canvas buffer.
			const canvas = document.createElement('canvas')
			canvas.width = width
			canvas.height = height
			const ctx = canvas.getContext('2d')
			if (!ctx) return file

			ctx.filter = 'contrast(1.15) saturate(1.1)'
			ctx.drawImage(source, 0, 0, width, height)
			ctx.filter = 'none'

			// ── Step 2: unsharp-mask sharpening via convolution ───────────────
			// Kernel: identity − (1/8 × Laplacian).
			// At SHARPEN_AMOUNT = 0.3 this is effectively:
			//   center pixel = pixel + 0.3 × (pixel − average_of_neighbours)
			// which accentuates edges without saturating flat regions.
			const imageData = ctx.getImageData(0, 0, width, height)
			const src = imageData.data
			const dst = new Uint8ClampedArray(src.length)

			const w = width
			const h = height
			const a = SHARPEN_AMOUNT

			// Convolution kernel weights:
			//  -a/8  -a/8  -a/8
			//  -a/8  1+a   -a/8
			//  -a/8  -a/8  -a/8
			const edgeW = -a / 8
			const centerW = 1 + a

			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const i = (y * w + x) * 4

					// For border pixels, copy as-is to avoid edge artefacts.
					if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
						dst[i] = src[i]; dst[i + 1] = src[i + 1]
						dst[i + 2] = src[i + 2]; dst[i + 3] = src[i + 3]
						continue
					}

					// 8-connected neighbours
					const tl = ((y - 1) * w + (x - 1)) * 4
					const tc = ((y - 1) * w +  x     ) * 4
					const tr = ((y - 1) * w + (x + 1)) * 4
					const ml = ( y      * w + (x - 1)) * 4
					const mr = ( y      * w + (x + 1)) * 4
					const bl = ((y + 1) * w + (x - 1)) * 4
					const bc = ((y + 1) * w +  x     ) * 4
					const br = ((y + 1) * w + (x + 1)) * 4

					for (let c = 0; c < 3; c++) {
						const val =
							centerW * src[i + c] +
							edgeW * (
								src[tl + c] + src[tc + c] + src[tr + c] +
								src[ml + c] +               src[mr + c] +
								src[bl + c] + src[bc + c] + src[br + c]
							)
						// Uint8ClampedArray clamps to [0, 255] automatically.
						dst[i + c] = val
					}
					dst[i + 3] = src[i + 3] // preserve alpha
				}
			}

			ctx.putImageData(new ImageData(dst, width, height), 0, 0)

			// ── Encode to JPEG ────────────────────────────────────────────────
			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY),
			)
			if (!blob || blob.size >= file.size) return file

			const baseName = file.name.replace(/\.[^.]+$/, '') || `scan-${Date.now()}`
			return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
		} finally {
			releaseBitmap()
		}
	} catch (err) {
		console.warn('[imagePreprocess] Falling back to the unprocessed photo:', err)
		return file
	}
}
