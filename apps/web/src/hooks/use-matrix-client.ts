import {
  invalidateAll,
  invalidateRoomDetail,
  invalidateRoomList,
  invalidateRoomMembers,
  invalidateTimeline,
  startMatrixClient,
  startMockClient,
  stopMatrixClient,
  stopMockClient,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useMatrixClientLifecycle(): void {
  const session = useAuthStore(s => s.session)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const mockMode = useAuthStore(s => s.mockMode)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !session)
      return

    function handleQueryInvalidation(event: string, roomId?: string): void {
      switch (event) {
        case 'sync.prepared':
          invalidateAll(queryClient)
          break
        case 'room.timeline':
          if (roomId) {
            invalidateTimeline(queryClient, roomId)
            invalidateRoomList(queryClient)
          }
          break
        case 'room.name':
        case 'room.list':
        case 'room.join':
          invalidateRoomList(queryClient)
          break
        case 'room.membership':
          if (roomId) {
            invalidateRoomMembers(queryClient, roomId)
            invalidateRoomDetail(queryClient, roomId)
          }
          break
        case 'room.receipt':
          if (roomId)
            invalidateRoomDetail(queryClient, roomId)
          break
        case 'room.leave':
          invalidateRoomList(queryClient)
          break
      }
    }

    if (mockMode) {
      void startMockClient(session)
    }
    else {
      void startMatrixClient({
        session,
        onQueryInvalidation: handleQueryInvalidation,
      })
    }

    return () => {
      if (mockMode) {
        stopMockClient()
      }
      else {
        void stopMatrixClient()
      }
    }
  }, [isAuthenticated, session, mockMode, queryClient])
}
