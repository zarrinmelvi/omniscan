import { toastController } from '@ionic/vue'

async function show(message: string, color: 'success' | 'danger', duration: number): Promise<void> {
	const toast = await toastController.create({ message, duration, color, position: 'top' })
	await toast.present()
}

export function showSuccessToast(message: string): Promise<void> {
	return show(message, 'success', 2000)
}

export function showErrorToast(message: string): Promise<void> {
	return show(message, 'danger', 3000)
}
