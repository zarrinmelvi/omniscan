import bcrypt from 'bcrypt'

export default async () => {
	const hashedPassword = await bcrypt.hash('OmniscanPass1!', 10)

	return {
		name: 'Demo User',
		email: 'demo@omniscan.test',
		password: hashedPassword,
		last_active: new Date(),
		status: 'active',
	}
}
