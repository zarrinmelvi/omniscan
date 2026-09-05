import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'

interface RegisterUserPayload {
	name: string
	email: string
	password_hash: string
	halal_preference: boolean
	allergen_ids?: number[]
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean'
}

function invalidAllergenIdArray(value: unknown): value is number[] {
	if (value === undefined) return false
	if (!Array.isArray(value)) return true
	const arr = value as unknown[]
	return !arr.every((item) => typeof item === 'number' && Number.isInteger(item))
}

function validateRegisterUserPayload(body: unknown): RegisterUserPayload {
	if (typeof body !== 'object' || body === null) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid request body: expected a JSON object.',
		})
	}

	const candidate = body as Record<string, unknown>

	if (!isNonEmptyString(candidate.name)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid or missing field: "name" must be a non-empty string.',
		})
	}

	if (!isNonEmptyString(candidate.email)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid or missing field: "email" must be a non-empty string.',
		})
	}

	if (!isNonEmptyString(candidate.password_hash)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid or missing field: "password_hash" must be a non-empty string.',
		})
	}

	if (!isBoolean(candidate.halal_preference)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid or missing field: "halal_preference" must be a boolean.',
		})
	}

	if (invalidAllergenIdArray(candidate.allergen_ids)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid field: "allergen_ids" must be an array of integers.',
		})
	}

	return {
		name: candidate.name,
		email: candidate.email,
		password_hash: candidate.password_hash,
		halal_preference: candidate.halal_preference,
		allergen_ids: candidate.allergen_ids as number[] | undefined,
	}
}

export default eventHandler(async (event) => {
	try {
		const body = await readBody(event)
		const payload = validateRegisterUserPayload(body)

		const result = await prisma.$transaction(async (tx) => {
			// 1. Create user including the explicitly required created_at field
			const user = await tx.user.create({
				data: {
					name: payload.name,
					email: payload.email,
					password: payload.password_hash,
					created_at: new Date(),
					last_active: new Date(),
					status: 'active',
				},
			})

			// 2. Create Dietary Profile
			await tx.dietaryProfile.create({
				data: {
					user_id: user.id,
					halal_pref: payload.halal_preference,
				},
			})

			// 3. Connect existing allergen records if array is populated
			if (payload.allergen_ids && payload.allergen_ids.length > 0) {
				await tx.user.update({
					where: { id: user.id },
					data: {
						allergens: {
							connect: payload.allergen_ids.map((id) => ({ id })),
						},
					},
				})
			}

			return user
		})

		return {
			success: true,
			user: {
				id: result.id,
				name: result.name,
				email: result.email,
			},
		}
	} catch (error: any) {
		if (error.statusCode) throw error

		if (error.code === 'P2002') {
			throw createError({
				statusCode: 409,
				statusMessage: 'A user with this email address already exists.',
			})
		}

		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'An unexpected error occurred during registration.',
		})
	}
})
