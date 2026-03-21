import { useRoomsStore } from '@matrix-web/matrix-client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NotificationSettings {
  enabled: boolean
  soundEnabled: boolean
  soundVolume: number
  privateReadReceipts: boolean
  mutedRooms: Set<string>
  setEnabled: (enabled: boolean) => void
  setSoundEnabled: (soundEnabled: boolean) => void
  setSoundVolume: (volume: number) => void
  setPrivateReadReceipts: (privateReadReceipts: boolean) => void
  muteRoom: (roomId: string) => void
  unmuteRoom: (roomId: string) => void
  isRoomMuted: (roomId: string) => boolean
}

export const useNotificationStore = create<NotificationSettings>()(
  persist(
    (set, get) => ({
      enabled: false,
      soundEnabled: true,
      soundVolume: 0.7,
      privateReadReceipts: false,
      mutedRooms: new Set<string>(),

      setEnabled: enabled => set({ enabled }),
      setSoundEnabled: soundEnabled => set({ soundEnabled }),
      setSoundVolume: volume => set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
      setPrivateReadReceipts: privateReadReceipts => set({ privateReadReceipts }),

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
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        privateReadReceipts: state.privateReadReceipts,
        mutedRooms: [...state.mutedRooms],
      }),
      merge: (persisted, current) => {
        const p = persisted as { enabled?: boolean, soundEnabled?: boolean, soundVolume?: number, privateReadReceipts?: boolean, mutedRooms?: string[] } | null
        return {
          ...current,
          enabled: p?.enabled ?? false,
          soundEnabled: p?.soundEnabled ?? true,
          soundVolume: p?.soundVolume ?? 0.7,
          privateReadReceipts: p?.privateReadReceipts ?? false,
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

let notificationAudio: HTMLAudioElement | null = null

function getNotificationAudio(): HTMLAudioElement {
  if (!notificationAudio) {
    notificationAudio = new Audio('/sound/notification.ogg')
  }
  return notificationAudio
}

export function playNotificationSound(): void {
  const { soundEnabled, soundVolume } = useNotificationStore.getState()
  if (!soundEnabled)
    return

  const audio = getNotificationAudio()
  audio.volume = soundVolume
  audio.currentTime = 0
  audio.play().catch(() => {
    // Ignore autoplay policy errors
  })
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

  // Don't notify for the active room if page is focused
  const activeRoomId = useRoomsStore.getState().activeRoomId
  if (activeRoomId === roomId && document.visibilityState === 'visible' && document.hasFocus())
    return

  // Play notification sound (independent of browser notification permission)
  playNotificationSound()

  // Show browser notification if permitted
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return

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
