import { useAuthStore, useMessagesStore } from '@matrix-web/matrix-client'
import { useEffect, useRef } from 'react'
import { showMessageNotification } from '../lib/notifications'

/**
 * Subscribe to new messages and show browser notifications.
 * Must be called once at the app root level.
 */
export function useNotificationListener(): void {
  const initializedRef = useRef(false)

  useEffect(() => {
    // Track which messages we've already seen (to avoid notifying on initial load)
    const seenMessages = new Set<string>()

    // Mark all current messages as seen
    const currentState = useMessagesStore.getState()
    for (const [, messages] of currentState.timelines) {
      for (const msg of messages) {
        seenMessages.add(msg.eventId)
      }
    }

    initializedRef.current = true

    const unsub = useMessagesStore.subscribe((state, prevState) => {
      if (!initializedRef.current)
        return

      const userId = useAuthStore.getState().session?.userId

      for (const [roomId, messages] of state.timelines) {
        const prevMessages = prevState.timelines.get(roomId)
        const prevLength = prevMessages?.length ?? 0

        if (messages.length <= prevLength)
          continue

        // Check new messages at the end
        for (let i = prevLength; i < messages.length; i++) {
          const msg = messages[i]!
          if (seenMessages.has(msg.eventId))
            continue
          seenMessages.add(msg.eventId)

          // Don't notify for own messages
          if (msg.senderId === userId)
            continue

          showMessageNotification(roomId, msg.senderName, msg.body)
        }
      }
    })

    return unsub
  }, [])
}
