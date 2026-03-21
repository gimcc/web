import type { RoomTrustSummary, UserDeviceInfo } from '@matrix-web/matrix-client'
import {
  getMatrixClient,
  getRoomTrustSummary,
  getUserDevicesWithTrust,
  isUserFullyVerified,
} from '@matrix-web/matrix-client'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── User Device Trust ──────────────────────────────────────────────

interface UseUserDeviceTrustResult {
  devices: UserDeviceInfo[]
  loading: boolean
  refresh: () => void
}

export function useUserDeviceTrust(userId: string | null): UseUserDeviceTrustResult {
  const [devices, setDevices] = useState<UserDeviceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    const client = getMatrixClient()
    if (!client || !userId) return

    setLoading(true)
    try {
      const result = await getUserDevicesWithTrust(client, userId)
      if (mountedRef.current) setDevices(result)
    } catch {
      // Crypto may not be ready
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  return { devices, loading, refresh: load }
}

// ─── User Verified Status ───────────────────────────────────────────

export function useUserVerified(userId: string | null): boolean | null {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const client = getMatrixClient()
    if (!client || !userId) return

    isUserFullyVerified(client, userId)
      .then((v) => { if (!cancelled) setVerified(v) })
      .catch(() => { if (!cancelled) setVerified(null) })

    return () => { cancelled = true }
  }, [userId])

  return verified
}

// ─── Room Trust Summary ─────────────────────────────────────────────

interface UseRoomTrustResult {
  summary: RoomTrustSummary | null
  loading: boolean
  refresh: () => void
}

export function useRoomTrust(roomId: string | null): UseRoomTrustResult {
  const [summary, setSummary] = useState<RoomTrustSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    const client = getMatrixClient()
    if (!client || !roomId) return

    setLoading(true)
    try {
      const result = await getRoomTrustSummary(client, roomId)
      if (mountedRef.current) setSummary(result)
    } catch {
      // Crypto may not be ready
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [load])

  return { summary, loading, refresh: load }
}
