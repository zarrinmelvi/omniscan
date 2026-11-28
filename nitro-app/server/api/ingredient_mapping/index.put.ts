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
		| { id?: number; scientific_term?: string; simplified_term?: string; allergen_id?: number }
		| null

	if (!body?.id || Number.isNaN(Number(body.id))) {
		throw createError({ statusCode: 400, statusMessage: 'A valid ingredient mapping id is required.' })
	}

	// Validate only the fields being updated.
	if (body.scientific_term !== undefined) {
		validateTerm(body.scientific_term.trim(), 'Scientific / raw OCR term')
	}
	if (body.simplified_term !== undefined) {
		validateTerm(body.simplified_term.trim(), 'Simplified consumer term')
	}

	try {
		const mapping = await prisma.ingredientMapping.update({
			where: { id: Number(body.id) },
			data: {
				...(body.scientific_term !== undefined ? { scientific_term: body.scientific_term.trim() } : {}),
				...(body.simplified_term !== undefined ? { simplified_term: body.simplified_term.trim() } : {}),
				...(body.allergen_id !== undefined ? { allergen_id: Number(body.allergen_id) } : {}),
			},
		})
		return { success: true, ingredient_mapping: mapping }
	} catch (err: any) {
		if (err?.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'That scientific term is already mapped.' })
		}
		if (err?.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Ingredient mapping not found.' })
		}
		if (err?.code === 'P2003') {
			throw createError({ statusCode: 400, statusMessage: 'Referenced allergen does not exist.' })
		}
		throw createError({ statusCode: 400, statusMessage: err?.message || 'Failed to update ingredient mapping.' })
	}
})
