import {
  getMatrixClient,
  isMatrixToUrl,
  joinRoom,
  parseMatrixToUrl,
  useRoomsStore,
} from '@matrix-web/matrix-client'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const MATRIX_TO_IN_HASH = /https?:\/\/matrix\.to\/#\/\S+/

/** Delay before processing deep links, allowing client initialization */
const DEEP_LINK_INIT_DELAY_MS = 1000

/**
 * Handle matrix.to deep links from URL hash or search params.
 * Checks on mount and listens for hashchange events.
 */
export function useDeepLinkHandler() {
  const { t } = useTranslation()
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)
  const processingRef = useRef(false)

  const processLink = useCallback(async (url: string) => {
    if (processingRef.current)
      return
    if (!isMatrixToUrl(url))
      return

    const parsed = parseMatrixToUrl(url)
    if (!parsed)
      return

    const client = getMatrixClient()
    if (!client)
      return

    processingRef.current = true

    try {
      if (parsed.type === 'room' || parsed.type === 'event') {
        // Check if already in the room
        const rooms = useRoomsStore.getState().rooms
        let targetRoomId: string | null = null

        // If identifier is a room ID, check directly
        if (parsed.identifier.startsWith('!')) {
          if (rooms.has(parsed.identifier)) {
            targetRoomId = parsed.identifier
          }
        }

        // Try to join if not already in the room
        if (!targetRoomId) {
          try {
            targetRoomId = await joinRoom(client, parsed.identifier)
          }
          catch {
            console.error(`[deep-link] Failed to join room: ${parsed.identifier}`)
            console.warn(t('deep_link.error_join_failed'))
            return
          }
        }

        if (targetRoomId) {
          setActiveRoom(targetRoomId)
        }
      }

      // For user links, we could open a DM dialog, but for now just log
      // User link handling can be expanded in the future
    }
    finally {
      processingRef.current = false
    }
  }, [setActiveRoom, t])

  // Check URL on mount
  useEffect(() => {
    const checkUrl = () => {
      // Check hash fragment for matrix.to links
      const hash = window.location.hash
      if (hash) {
        // Extract matrix.to URL from hash if present
        const matrixToMatch = hash.match(MATRIX_TO_IN_HASH)
        if (matrixToMatch) {
          processLink(matrixToMatch[0])
          return
        }
      }

      // Check search params for a 'link' parameter
      const params = new URLSearchParams(window.location.search)
      const link = params.get('link')
      if (link && isMatrixToUrl(link)) {
        processLink(link)
      }
    }

    // Delay to let the client initialize first
    const timer = setTimeout(checkUrl, DEEP_LINK_INIT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [processLink])
}

/**
 * Handle matrix.to link clicks within message content.
 * Returns a click handler that intercepts matrix.to links.
 */
export function useMatrixLinkClickHandler() {
  const { t } = useTranslation()
  const setActiveRoom = useRoomsStore(s => s.setActiveRoom)

  return useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const anchor = target.closest('a')
    if (!anchor)
      return

    const href = anchor.getAttribute('href')
    if (!href || !isMatrixToUrl(href))
      return

    event.preventDefault()

    const parsed = parseMatrixToUrl(href)
    if (!parsed)
      return

    const client = getMatrixClient()
    if (!client)
      return

    if (parsed.type === 'room' || parsed.type === 'event') {
      const rooms = useRoomsStore.getState().rooms

      // Check if already joined
      if (parsed.identifier.startsWith('!') && rooms.has(parsed.identifier)) {
        setActiveRoom(parsed.identifier)
        return
      }

      // Try to join
      joinRoom(client, parsed.identifier)
        .then((roomId) => {
          setActiveRoom(roomId)
        })
        .catch(() => {
          console.error(`[deep-link] Failed to join room: ${parsed.identifier}`)
          console.warn(t('deep_link.error_join_failed'))
        })
    }
  }, [setActiveRoom, t])
}
