import { eventHandler, readBody, createError } from 'h3'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../utils/requireAuth'

const MAX_AVATAR_BASE64_LENGTH = 7_000_000 // ~5MB raw image after base64 overhead

interface ProfileUpdateBody {
	name?: string
	first_name?: string
	last_name?: string
	username?: string
	halal_pref?: boolean
	allergen_ids?: number[]
	avatar_base64?: string | null
	custom_preferences?: string[]
}

function isPositiveInteger(value: unknown): boolean {
	const parsed = Number(value)
	return typeof value !== 'undefined' && Number.isInteger(parsed) && parsed > 0
}

function validateBody(body: Record<string, unknown>): ProfileUpdateBody {
	if (typeof body.name !== 'undefined' && typeof body.name !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid body field: "name" must be a string.' })
	}

	if (typeof body.first_name !== 'undefined' && typeof body.first_name !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid body field: "first_name" must be a string.' })
	}
	if (typeof body.last_name !== 'undefined' && typeof body.last_name !== 'string') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid body field: "last_name" must be a string.' })
	}
	if (typeof body.username !== 'undefined') {
		if (typeof body.username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(body.username.trim())) {
			throw createError({ statusCode: 400, statusMessage: 'Username must be 3-20 characters, letters, numbers, and underscores only.' })
		}
	}

	if (typeof body.halal_pref !== 'undefined' && typeof body.halal_pref !== 'boolean') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid body field: "halal_pref" must be a boolean.' })
	}

	if (
		typeof body.allergen_ids !== 'undefined' &&
		(!Array.isArray(body.allergen_ids) || !body.allergen_ids.every((entry) => isPositiveInteger(entry)))
	) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid body field: "allergen_ids" must be an array of positive integers.' })
	}

	// NEW — avatar_base64 validation (string data URI, or explicit null to clear it)
	if (typeof body.avatar_base64 !== 'undefined' && body.avatar_base64 !== null) {
		if (typeof body.avatar_base64 !== 'string' || !body.avatar_base64.startsWith('data:image/')) {
			throw createError({ statusCode: 400, statusMessage: 'Invalid body field: "avatar_base64" must be a valid image data URI or null.' })
		}
		if (body.avatar_base64.length > MAX_AVATAR_BASE64_LENGTH) {
			throw createError({ statusCode: 400, statusMessage: 'Avatar image is too large. Please use a smaller photo.' })
		}
	}

	// NEW — custom_preferences validation
	if (
		typeof body.custom_preferences !== 'undefined' &&
		(!Array.isArray(body.custom_preferences) || !body.custom_preferences.every((entry) => typeof entry === 'string'))
	) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid body field: "custom_preferences" must be an array of strings.' })
	}

	return {
		name: body.name as string | undefined,
		first_name: body.first_name as string | undefined,
		last_name: body.last_name as string | undefined,
		username: body.username as string | undefined,
		halal_pref: body.halal_pref as boolean | undefined,
		allergen_ids: (body.allergen_ids as number[] | undefined)?.map(Number),
		avatar_base64: body.avatar_base64 as string | null | undefined,
		custom_preferences: (body.custom_preferences as string[] | undefined)?.map((p) => p.trim()).filter(Boolean),
	}
}

export default eventHandler(async (event) => {
	const authUser = requireAuth(event) // CHANGED — was manual event.context.user check

	const rawBody = await readBody(event)
	const { name, first_name, last_name, username, halal_pref, allergen_ids, avatar_base64, custom_preferences } = validateBody(rawBody)
	const id = authUser.id

	try {
		const existingUser = await prisma.user.findUnique({
			where: { id },
			include: { dietary_prof: true },
		})

		if (!existingUser) {
			throw createError({ statusCode: 404, statusMessage: 'User not found.' })
		}

		const updatedUser = await prisma.$transaction(async (tx) => {
			if (typeof halal_pref !== 'undefined' || typeof custom_preferences !== 'undefined') {
				const existingDietaryProfile = existingUser.dietary_prof[0]

				const dietaryData = {
					...(typeof halal_pref !== 'undefined' && { halal_pref }),
					...(typeof custom_preferences !== 'undefined' && { custom_preferences }),
				}

				if (existingDietaryProfile) {
					await tx.dietaryProfile.update({
						where: { id: existingDietaryProfile.id },
						data: dietaryData,
					})
				} else {
					await tx.dietaryProfile.create({
						data: {
							user_id: id,
							halal_pref: halal_pref ?? false,
							custom_preferences: custom_preferences ?? [],
						},
					})
				}
			}

			return tx.user.update({
				where: { id },
				data: {
					...(typeof name !== 'undefined' && { name }),
					...(typeof first_name !== 'undefined' && { first_name: first_name.trim() }),
					...(typeof last_name !== 'undefined' && { last_name: last_name.trim() }),
					...(typeof username !== 'undefined' && { username: username.trim() }),
					// Recompute derived display name when either name part changes
					...((typeof first_name !== 'undefined' || typeof last_name !== 'undefined') && {
						name: `${(first_name ?? existingUser.first_name ?? '').trim()} ${(last_name ?? existingUser.last_name ?? '').trim()}`.trim() || existingUser.name,
					}),
					...(typeof avatar_base64 !== 'undefined' && { avatar_base64 }),
					...(typeof allergen_ids !== 'undefined' && {
						allergens: { set: allergen_ids.map((allergenId) => ({ id: allergenId })) },
					}),
				},
				include: {
					dietary_prof: true,
					allergens: true,
				},
			})
		})

		const { password: _password, ...safeUser } = updatedUser

		return {
			success: true,
			user: safeUser,
		}
	} catch (error: any) {
		if (error.statusCode) throw error

		if (error?.code === 'P2002' && Array.isArray(error?.meta?.target) && error.meta.target.includes('username')) {
			throw createError({ statusCode: 400, statusMessage: 'That username is already taken. Please choose another.' })
		}

		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'An unexpected error occurred while updating the profile.',
		})
	}
})
