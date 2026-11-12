/**
 * Downscales large photos before upload so scans upload and process faster.
 * Falls back to the original file whenever anything goes wrong, so a resize
 * problem can never block a scan.
 */

const DEFAULT_MAX_EDGE = 1600
const DEFAULT_QUALITY = 0.85
// Files at or below this size are sent as-is (already cheap to upload).
const SKIP_BELOW_BYTES = 500 * 1024

async function loadBitmap(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
	if (typeof createImageBitmap === 'function') {
		// 'from-image' applies the EXIF orientation so portrait phone photos stay upright.
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
		return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
	}

	const url = URL.createObjectURL(file)
	try {
		const img = new Image()
		img.decoding = 'async'
		img.src = url
		await img.decode()
		return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} }
	} finally {
		URL.revokeObjectURL(url)
	}
}

export async function resizeImageForUpload(
	file: File,
	maxEdge: number = DEFAULT_MAX_EDGE,
	quality: number = DEFAULT_QUALITY,
): Promise<File> {
	try {
		if (!file.type.startsWith('image/')) return file

		const { source, width, height, release } = await loadBitmap(file)

		try {
			const longEdge = Math.max(width, height)
			if (longEdge <= maxEdge && file.size <= SKIP_BELOW_BYTES) return file

			const scale = Math.min(1, maxEdge / longEdge)
			const targetWidth = Math.max(1, Math.round(width * scale))
			const targetHeight = Math.max(1, Math.round(height * scale))

			const canvas = document.createElement('canvas')
			canvas.width = targetWidth
			canvas.height = targetHeight
			const ctx = canvas.getContext('2d')
			if (!ctx) return file
			ctx.drawImage(source, 0, 0, targetWidth, targetHeight)

			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
			if (!blob || blob.size >= file.size) return file

			const baseName = file.name.replace(/\.[^.]+$/, '') || `scan-${Date.now()}`
			return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
		} finally {
			release()
		}
	} catch (err) {
		console.warn('[imageResize] Falling back to the original photo:', err)
		return file
	}
}
