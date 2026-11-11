import { describe, it, expect, vi, beforeEach } from 'vitest'

const present = vi.fn()
const create = vi.fn()

vi.mock('@ionic/vue', () => ({
	toastController: { create: (...args: unknown[]) => create(...args) },
}))

import { showSuccessToast, showErrorToast } from './toast'

describe('toast helpers', () => {
	beforeEach(() => {
		present.mockReset()
		create.mockReset()
		create.mockResolvedValue({ present })
	})

	it('shows a green success toast at the top', async () => {
		await showSuccessToast('Item successfully added to pantry.')
		expect(create).toHaveBeenCalledWith({
			message: 'Item successfully added to pantry.',
			duration: 2000,
			color: 'success',
			position: 'top',
		})
		expect(present).toHaveBeenCalledTimes(1)
	})

	it('shows a red error toast at the top', async () => {
		await showErrorToast('Nope')
		expect(create).toHaveBeenCalledWith({ message: 'Nope', duration: 3000, color: 'danger', position: 'top' })
		expect(present).toHaveBeenCalledTimes(1)
	})
})
