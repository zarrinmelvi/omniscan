import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'
import { findMatchedUserAllergens, type UserAllergenRecord } from '../../lib/allergen-matching'

/**
 * Feature E — "Unmapped terms" panel.
 *
 * Surfaces candidate ingredient tokens that appear in REAL recent scan data
 * but are NOT covered by any existing allergen mapping, plus a lightweight,
 * deterministic "AI suggests <allergen>" heuristic grounded in the real term
 * data. No Ollama call, no fabricated tokens or suggestions.
 */

// Generic ingredient words that are never useful as allergen-mapping candidates.
const STOPWORDS = new Set<string>([
	'water',
	'salt',
	'sugar',
	'natural',
	'artificial',
	'flavor',
	'flavors',
	'flavour',
	'flavours',
	'flavoring',
	'flavouring',
	'color',
	'colors',
	'colour',
	'colours',
	'coloring',
	'colouring',
	'acid',
	'acidity',
	'regulator',
	'preservative',
	'preservatives',
	'emulsifier',
	'stabilizer',
	'stabiliser',
	'thickener',
	'antioxidant',
	'ingredients',
	'ingredient',
	'contains',
	'may',
	'and',
	'the',
	'with',
	'from',
	'added',
	'less',
	'than',
	'other',
	'spices',
	'spice',
	'extract',
	'powder',
	'concentrate',
	'syrup',
	'oil',
	'starch',
])

function longestCommonSubstringLength(a: string, b: string): number {
	if (!a || !b) return 0
	const m = a.length
	const n = b.length
	let best = 0
	// Rolling DP to keep it O(n) memory.
	let prev = new Array<number>(n + 1).fill(0)
	for (let i = 1; i <= m; i++) {
		const curr = new Array<number>(n + 1).fill(0)
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				curr[j] = prev[j - 1] + 1
				if (curr[j] > best) best = curr[j]
			}
		}
		prev = curr
	}
	return best
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const query = getQuery(event)
	const parsedLimit = Number(query.limit)
	const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 50) : 8

	try {
		// ── 1. Pull real ingredient text from recently scanned products ─────
		const since = new Date(Date.now() - 90 * 86400000)
		const scans = await prisma.scan.findMany({
			where: { scan_time: { gte: since } },
			select: { product: { select: { ingredient_text: true } } },
			take: 500,
			orderBy: { scan_time: 'desc' },
		})

		let ingredientTexts = scans.map((s) => s.product?.ingredient_text).filter((t): t is string => Boolean(t && t.trim()))

		// Fall back to recent products directly if the scan join yields nothing.
		if (ingredientTexts.length === 0) {
			const products = await prisma.product.findMany({
				where: { deleted_at: null },
				select: { ingredient_text: true },
				take: 500,
				orderBy: { updated_at: 'desc' },
			})
			ingredientTexts = products.map((p) => p.ingredient_text).filter((t): t is string => Boolean(t && t.trim()))
		}

		// ── 2. Load predefined allergens + mappings, build known-term set ───
		const allergens: UserAllergenRecord[] = await prisma.allergen.findMany({
			where: { is_predefined: true },
			select: {
				id: true,
				name: true,
				scientific_name: true,
				ingredient_mapping: { select: { scientific_term: true, simplified_term: true } },
			},
		})

		const knownTerms = new Set<string>()
		for (const a of allergens) {
			if (a.name) knownTerms.add(a.name.toLowerCase())
			if (a.scientific_name) knownTerms.add(a.scientific_name.toLowerCase())
			for (const m of a.ingredient_mapping) {
				if (m.scientific_term) knownTerms.add(m.scientific_term.toLowerCase())
				if (m.simplified_term) knownTerms.add(m.simplified_term.toLowerCase())
			}
		}

		// ── 3. Tokenize + count frequency ──────────────────────────────────
		const freq = new Map<string, number>()
		for (const text of ingredientTexts) {
			const tokens = text
				.split(/[,/;()[\]{}]|\band\b/gi)
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean)

			for (const token of tokens) {
				// Strip surrounding punctuation/percentages.
				const cleaned = token.replace(/^[^a-z]+|[^a-z]+$/gi, '').trim()
				if (cleaned.length < 3) continue
				if (/^\d+$/.test(cleaned)) continue
				if (STOPWORDS.has(cleaned)) continue
				freq.set(cleaned, (freq.get(cleaned) ?? 0) + 1)
			}
		}

		// ── 4. Keep only UNMAPPED tokens ────────────────────────────────────
		// A token is unmapped if it is not an already-known term AND the existing
		// deterministic matcher finds no match for it.
		const unmappedCandidates: { term: string; seen_count: number }[] = []
		for (const [term, seen_count] of freq.entries()) {
			if (knownTerms.has(term)) continue
			if (findMatchedUserAllergens(term, allergens).length > 0) continue
			unmappedCandidates.push({ term, seen_count })
		}

		const total_candidates = unmappedCandidates.length

		// ── 5. Deterministic "AI suggests" heuristic ────────────────────────
		// For each unmapped token, score each allergen by the best overlap
		// between the token and the allergen's known terms. Grounded entirely in
		// real term data.
		function suggestAllergen(token: string): { id: number; name: string } | null {
			let bestId: number | null = null
			let bestName: string | null = null
			let bestScore = 0

			for (const a of allergens) {
				const terms = [
					a.name,
					a.scientific_name,
					...a.ingredient_mapping.flatMap((m) => [m.scientific_term, m.simplified_term]),
				]
					.filter((t): t is string => Boolean(t))
					.map((t) => t.toLowerCase())

				let score = 0
				for (const term of terms) {
					if (term.length < 3) continue
					// Containment either direction is a strong signal.
					if (token.includes(term) || term.includes(token)) {
						score = Math.max(score, Math.min(token.length, term.length))
						continue
					}
					// Shared 4+ char substring.
					const lcs = longestCommonSubstringLength(token, term)
					if (lcs >= 4) score = Math.max(score, lcs)
				}
				// Direct name-prefix similarity nudge.
				const name = a.name.toLowerCase()
				if (name.length >= 3 && (token.startsWith(name) || name.startsWith(token))) {
					score = Math.max(score, Math.min(token.length, name.length))
				}

				if (score > bestScore) {
					bestScore = score
					bestId = a.id
					bestName = a.name
				}
			}

			return bestScore > 0 && bestId !== null && bestName !== null ? { id: bestId, name: bestName } : null
		}

		// ── 6. Sort by frequency, take limit, attach suggestions ────────────
		const unmapped = unmappedCandidates
			.sort((a, b) => b.seen_count - a.seen_count || a.term.localeCompare(b.term))
			.slice(0, limit)
			.map((c) => {
				const suggestion = suggestAllergen(c.term)
				return {
					term: c.term,
					seen_count: c.seen_count,
					suggested_allergen_id: suggestion?.id ?? null,
					suggested_allergen_name: suggestion?.name ?? null,
				}
			})

		return { success: true, unmapped, total_candidates }
	} catch (err: any) {
		if (err?.statusCode) throw err
		console.error('Unmapped-terms lookup failed:', err)
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to load unmapped terms.' })
	}
})
