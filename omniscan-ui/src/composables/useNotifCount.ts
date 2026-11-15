import { ref } from 'vue'
import { apiFetch } from '@/utils/api'
import { setBadge } from '@/utils/appBadge'

// Module-level singleton ref — shared across all component instances.
// AppHeader reads this ref; NotificationsPage writes to it after mark-all-read.
const unreadNotifCount = ref(0)

export function useNotifCount() {
  async function fetchUnreadNotifs(): Promise<void> {
    try {
      const res = await apiFetch<{ success: boolean; unread_count: number }>('/api/notification', { method: 'GET' })
      unreadNotifCount.value = res.unread_count || 0
    } catch {
      unreadNotifCount.value = 0
    }
    await setBadge(unreadNotifCount.value)
  }

  function decrementUnread(by = 1): void {
    unreadNotifCount.value = Math.max(0, unreadNotifCount.value - by)
    void setBadge(unreadNotifCount.value)
  }

  function clearUnread(): void {
    unreadNotifCount.value = 0
    void setBadge(0)
  }

  return { unreadNotifCount, fetchUnreadNotifs, decrementUnread, clearUnread }
}
