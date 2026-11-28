import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAdminAuth } from '../../utils/requireAdminAuth'

const MAPPING_TERM_RE = /^[A-Za-z\s\-]+$/

function validateTerm(value: string, field: string): void {
	if (value.length > 50) {
		throw createError({ statusCode: 400, statusMessage: `${field} must be 50 characters or fewer.` })
	}
	if (!MAPPING_TERM_RE.test(value)) {
		throw createError({ statusCode: 400, statusMessage: `${field} may only contain letters, spaces, and hyphens.` })
	}
}

export default defineEventHandler(async (event) => {
	requireAdminAuth(event)

	const body = (await readBody(event).catch(() => null)) as
		| { scientific_term?: string; simplified_term?: string; allergen_id?: number }
		| null

	if (!body?.scientific_term || typeof body.scientific_term !== 'string' || !body.scientific_term.trim()) {
		throw createError({ statusCode: 400, statusMessage: 'Scientific / raw OCR term is required.' })
	}
	if (!body?.allergen_id || Number.isNaN(Number(body.allergen_id))) {
		throw createError({ statusCode: 400, statusMessage: 'Please select an allergen.' })
	}

	const scientificTerm = body.scientific_term.trim()
	const simplifiedTerm = (body.simplified_term ?? body.scientific_term).trim()

	validateTerm(scientificTerm, 'Scientific / raw OCR term')
	validateTerm(simplifiedTerm, 'Simplified consumer term')

	try {
		const mapping = await prisma.ingredientMapping.create({
			data: {
				scientific_term: scientificTerm,
				simplified_term: simplifiedTerm,
				allergen_id: Number(body.allergen_id),
			},
		})
		return { success: true, ingredient_mapping: mapping }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'That scientific term is already mapped.' })
		}
		if (err?.code === 'P2003') {
			throw createError({ statusCode: 400, statusMessage: 'Referenced allergen does not exist.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to create ingredient mapping.' })
	}
})
