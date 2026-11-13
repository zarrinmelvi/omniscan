// Parses the OAuth `state` value forwarded through the Google redirect flow.
// Accepted values: '', 'mobile', 'register', 'mobile:register'.
export const ACCOUNT_EXISTS_MESSAGE = 'Account already exist'

export type GoogleIntent = 'register' | 'login'

export function parseGoogleState(state: unknown): { mobile: boolean; intent: GoogleIntent } {
	const parts = typeof state === 'string' ? state.toLowerCase().split(':') : []
	return {
		mobile: parts.includes('mobile'),
		intent: parts.includes('register') ? 'register' : 'login',
	}
}
