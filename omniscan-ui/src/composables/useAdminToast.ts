import { reactive } from 'vue'

export type AdminToastTone = 'default' | 'warning'

export const adminToastState = reactive<{ visible: boolean; message: string; tone: AdminToastTone }>({
	visible: false,
	message: '',
	tone: 'default',
})

let hideTimer: ReturnType<typeof setTimeout> | null = null

export function hideAdminToast(): void {
	if (hideTimer !== null) {
		clearTimeout(hideTimer)
		hideTimer = null
	}
	adminToastState.visible = false
}

export function showAdminToast(
	message: string,
	options: { duration?: number; tone?: AdminToastTone } = {},
): void {
	const { duration = 5000, tone = 'default' } = options
	if (hideTimer !== null) clearTimeout(hideTimer)
	adminToastState.message = message
	adminToastState.tone = tone
	adminToastState.visible = true
	hideTimer = setTimeout(hideAdminToast, duration)
}
