/**
 * Halal OCR fallback.
 *
 * When the primary Ollama scan identifies a Halal logo but cannot read the
 * certifying body (or reads it with low confidence), this module crops the
 * logo region and sends it to the same vision model with a focused text-
 * extraction prompt. If the resulting text contains "HALAL" or matches a
 * known certifier name, the scan is accepted without a re-scan request.
 *
 * Uses the same $fetch / OLLAMA_ENDPOINT / SCAN_VISION_MODEL as the main
 * scan route — no extra dependencies.
 */

import { $fetch } from 'ofetch'
import { OLLAMA_ENDPOINT, SCAN_VISION_MODEL } from './ollama-models'

// All known certifier abbreviations and common aliases.
// Keep in sync with the prompt in scan/index.post.ts and the HalalLogo DB rows.
const KNOWN_CERTIFIERS = [
	'JAKIM',   // Malaysia
	'MUIS',    // Singapore
	'ESMA',    // UAE
	'IFANCA',  // USA / international
	'IDCP',    // Indonesia
	'NCMF',    // Philippines
	'HDIP',    // Philippines
	'MASLAHA', // UK
	'HICCIP',  // India
	'BPJPH',   // Indonesia
	'MUI',     // Indonesia (older/common variant)
	'JAKIM',   // duplicate guard — still normalised away by Set
	'HMC',     // Halal Monitoring Committee (UK)
	'HFA',     // Halal Food Authority (UK)
	'ISWA',    // Islamic Society of Washington Area
	'IFRC',    // Islamic Food Research Centre
]

const OCR_TIMEOUT_MS = 5_000

/**
 * Sends a base64-encoded crop image to the Ollama vision model and asks it
 * to read any visible text. Returns the raw text string, or null on failure
 * or timeout. Never throws.
 */
export async function readLogoText(cropBase64: string): Promise<string | null> {
	// Strip the data URI prefix so we send a bare base64 string to Ollama,
	// matching the format used by the main scan route.
	const bare = cropBase64.replace(/^data:[^;]+;base64,/, '')

	const payload = {
		model: SCAN_VISION_MODEL,
		stream: false,
		format: 'json',
		messages: [
			{
				role: 'user',
				content:
					'Read every word of text visible in this image, including abbreviations and logos. ' +
					'Return ONLY a JSON object with a single key: { "text": "<all visible text as a single string>" }. ' +
					'Do not add commentary, markdown, or any other keys.',
				images: [bare],
			},
		],
	}

	try {
		const result = await Promise.race([
			$fetch<{ message: { content: string } }>(OLLAMA_ENDPOINT, {
				method: 'POST',
				headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
				body: payload,
			}),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('OCR timeout')), OCR_TIMEOUT_MS),
			),
		])

		const raw = result.message?.content ?? ''
		// The model may wrap JSON in code fences despite instructions — strip them.
		const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim()
		const parsed = JSON.parse(cleaned) as { text?: unknown }
		const text = typeof parsed.text === 'string' ? parsed.text : ''
		// ── Debug Point 4: log exactly what the OCR pass read from the crop ──
		console.log('[halal-debug] OCR text from logo crop:', JSON.stringify({ text: text || null }))
		return text || null
	} catch {
		// Timeout, network error, or malformed JSON — treat as no-read.
		return null
	}
}

/**
 * Checks whether OCR text from a logo crop contains enough signal to accept
 * the logo as a valid Halal certification mark.
 *
 * Returns the best-matching certifier name from `knownCertifiers` if one is
 * found, the string "HALAL" if the word is present but no certifier matched,
 * or null if the text contains neither.
 *
 * Callers should:
 *   - Non-null + certifier name  → try to match against HalalLogo DB rows
 *   - "HALAL" (no certifier)     → mark product halal_unverified=true (goes to Verification Panel)
 *   - null                       → proceed with normal rescan logic
 */
export function matchHalalFromText(
	ocrText: string,
	knownCertifiers: string[],
): string | null {
	const upper = ocrText.toUpperCase()

	// Must contain "HALAL" (Latin) or "حلال" (Arabic) as a baseline — prevents
	// accidental matches on unrelated logos that happen to share initials.
	const hasHalalWord = upper.includes('HALAL') || upper.includes('حلال')
	if (!hasHalalWord) return null

	// Check all known certifiers plus the static list for a substring match.
	const allCertifiers = Array.from(new Set([...KNOWN_CERTIFIERS, ...knownCertifiers]))
	for (const certifier of allCertifiers) {
		if (upper.includes(certifier.toUpperCase())) {
			return certifier
		}
	}

	// The word HALAL is present but no certifier could be identified.
	// Return the sentinel so the caller can route to Verification Panel.
	return 'HALAL'
}
