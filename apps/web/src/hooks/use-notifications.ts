import { getMatrixClient, useAuthStore, useTimelineStore } from '@matrix-web/matrix-client'
import { useEffect, useRef } from 'react'
import { showMessageNotification } from '../lib/notifications'

/**
 * Subscribe to timeline version bumps and show browser notifications for new messages.
 * Must be called once at the app root level.
 */
export function useNotificationListener(): void {
  const lastSeenTsRef = useRef<Map<string, number>>(new Map())
  const snapshotDoneRef = useRef(false)

  useEffect(() => {
    // Attempt initial snapshot — may be empty if client isn't ready yet
    snapshotRooms(lastSeenTsRef.current)
    if (lastSeenTsRef.current.size > 0) {
      snapshotDoneRef.current = true
    }

    const unsub = useTimelineStore.subscribe((state, prevState) => {
      const userId = useAuthStore.getState().session?.userId
      const mx = getMatrixClient()
      if (!mx || !userId)
        return

      // Lazy snapshot: if we haven't done it yet (client wasn't ready at mount),
      // snapshot now and skip this update to avoid flooding with notifications
      if (!snapshotDoneRef.current) {
        snapshotRooms(lastSeenTsRef.current)
        snapshotDoneRef.current = true
        return
      }

      // Check which rooms had version bumps
      for (const [roomId, version] of state.versions) {
        const prevVersion = prevState.versions.get(roomId) ?? 0
        if (version <= prevVersion)
          continue

        const room = mx.getRoom(roomId)
        if (!room)
          continue

        const events = room.getLiveTimeline().getEvents()
        const lastSeenTs = lastSeenTsRef.current.get(roomId) ?? 0

        // Check new events at the end of the timeline
        for (let i = events.length - 1; i >= 0; i--) {
          const event = events[i]!
          if (event.getTs() <= lastSeenTs)
            break

          const type = event.getType()
          if (type !== 'm.room.message' && type !== 'm.sticker')
            continue

          const sender = event.getSender()
          if (sender === userId)
            continue

          const content = event.getContent()
          const member = room.getMember(sender ?? '')
          const senderName = member?.name ?? sender ?? ''
          const body = content.body ?? ''

          showMessageNotification(roomId, senderName, body)
        }

        // Update last seen timestamp
        const lastEvent = events.at(-1)
        if (lastEvent) {
          lastSeenTsRef.current.set(roomId, lastEvent.getTs())
        }
      }
    })

    return unsub
  }, [])
}

/** Snapshot the latest event timestamp for all rooms currently in the SDK */
function snapshotRooms(map: Map<string, number>): void {
  const client = getMatrixClient()
  if (!client)
    return
  for (const room of client.getRooms()) {
    const events = room.getLiveTimeline().getEvents()
    const lastEvent = events.at(-1)
    if (lastEvent) {
      map.set(room.roomId, lastEvent.getTs())
    }
  }
}
