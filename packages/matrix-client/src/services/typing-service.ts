import type { MatrixClient } from 'matrix-js-sdk'

const TYPING_TIMEOUT_MS = 30_000
const INACTIVITY_MS = 3_000

export interface TypingService {
  startTyping: (roomId: string) => void
  stopTyping: (roomId: string) => void
  dispose: () => void
}

export function createTypingService(client: MatrixClient): TypingService {
  const inactivityTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const activeRooms = new Set<string>()

  function startTyping(roomId: string): void {
    // Clear existing inactivity timer
    const existing = inactivityTimers.get(roomId)
    if (existing)
      clearTimeout(existing)

    // Send typing notification if not already active
    if (!activeRooms.has(roomId)) {
      activeRooms.add(roomId)
      client.sendTyping(roomId, true, TYPING_TIMEOUT_MS).catch(() => {})
    }

    // Set inactivity timer to auto-stop
    const timer = setTimeout(() => {
      stopTyping(roomId)
    }, INACTIVITY_MS)
    inactivityTimers.set(roomId, timer)
  }

  function stopTyping(roomId: string): void {
    const timer = inactivityTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      inactivityTimers.delete(roomId)
    }

    if (activeRooms.has(roomId)) {
      activeRooms.delete(roomId)
      client.sendTyping(roomId, false, 0).catch(() => {})
    }
  }

  function dispose(): void {
    inactivityTimers.forEach((timer, roomId) => {
      clearTimeout(timer)
      if (activeRooms.has(roomId)) {
        client.sendTyping(roomId, false, 0).catch(() => {})
      }
    })
    inactivityTimers.clear()
    activeRooms.clear()
  }

  return { startTyping, stopTyping, dispose }
}
