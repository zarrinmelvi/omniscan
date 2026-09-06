import bcrypt from 'bcrypt'

export default async () => {
	const hashedPassword = await bcrypt.hash('password123', 10)

	return {
		name: 'Demo User',
		email: 'demo@omniscan.test',
		password: hashedPassword,
		last_active: new Date(),
		status: 'active',
	}
}
