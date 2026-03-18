import { useRoomsStore } from '@matrix-web/matrix-client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NotificationSettings {
  enabled: boolean
  mutedRooms: Set<string>
  setEnabled: (enabled: boolean) => void
  muteRoom: (roomId: string) => void
  unmuteRoom: (roomId: string) => void
  isRoomMuted: (roomId: string) => boolean
}

export const useNotificationStore = create<NotificationSettings>()(
  persist(
    (set, get) => ({
      enabled: false,
      mutedRooms: new Set<string>(),

      setEnabled: enabled => set({ enabled }),

      muteRoom: (roomId) => {
        const muted = new Set(get().mutedRooms)
        muted.add(roomId)
        set({ mutedRooms: muted })
      },

      unmuteRoom: (roomId) => {
        const muted = new Set(get().mutedRooms)
        muted.delete(roomId)
        set({ mutedRooms: muted })
      },

      isRoomMuted: roomId => get().mutedRooms.has(roomId),
    }),
    {
      name: 'matrix-web-notifications',
      partialize: state => ({
        enabled: state.enabled,
        mutedRooms: [...state.mutedRooms],
      }),
      merge: (persisted, current) => {
        const p = persisted as { enabled?: boolean, mutedRooms?: string[] } | null
        return {
          ...current,
          enabled: p?.enabled ?? false,
          mutedRooms: new Set(p?.mutedRooms ?? []),
        }
      },
    },
  ),
)

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window))
    return false
  if (Notification.permission === 'granted')
    return true
  if (Notification.permission === 'denied')
    return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window))
    return 'unsupported'
  return Notification.permission
}

export function showMessageNotification(
  roomId: string,
  senderName: string,
  body: string,
): void {
  const { enabled, isRoomMuted } = useNotificationStore.getState()
  if (!enabled)
    return
  if (isRoomMuted(roomId))
    return
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return

  // Don't notify for the active room
  const activeRoomId = useRoomsStore.getState().activeRoomId
  if (activeRoomId === roomId)
    return

  // Don't notify if the page is visible and focused
  if (document.visibilityState === 'visible' && document.hasFocus()) {
    if (activeRoomId === roomId)
      return
  }

  const room = useRoomsStore.getState().rooms.get(roomId)
  const roomName = room?.name ?? 'Unknown Room'

  const title = room?.isDirect ? senderName : `${senderName} in ${roomName}`
  const preview = body.length > 100 ? `${body.slice(0, 97)}...` : body

  const notification = new Notification(title, {
    body: preview,
    tag: `matrix-${roomId}`,
    icon: '/icon-192.png',
  } as NotificationOptions)

  notification.onclick = () => {
    window.focus()
    useRoomsStore.getState().setActiveRoom(roomId)
    notification.close()
  }
}
