import { useAuthStore } from '@matrix-web/matrix-client'
import { useEffect, useState } from 'react'

/**
 * Global in-memory cache for fetched media blob URLs.
 * Keyed by MXC URL → blob URL.
 */
const blobCache = new Map<string, string>()
const pendingFetches = new Map<string, Promise<string>>()

/**
 * Fetch media from the Matrix server using authenticated endpoints.
 * Tries /_matrix/client/v1/media/ first (authenticated, modern),
 * falls back to /_matrix/media/v3/ (legacy) if the first fails.
 */
async function fetchMediaBlob(
  mxcUrl: string,
  homeserverUrl: string,
  accessToken: string,
  thumbnail?: { width: number, height: number, method?: 'crop' | 'scale' },
): Promise<string> {
  const cached = blobCache.get(mxcUrl + (thumbnail ? `?t=${thumbnail.width}x${thumbnail.height}` : ''))
  if (cached)
    return cached

  const cacheKey = mxcUrl + (thumbnail ? `?t=${thumbnail.width}x${thumbnail.height}` : '')

  // Deduplicate concurrent fetches for the same URL
  const pending = pendingFetches.get(cacheKey)
  if (pending)
    return pending

  const fetchPromise = (async () => {
    const [serverName, mediaId] = mxcUrl.slice(6).split('/')
    const method = thumbnail?.method ?? 'scale'

    // Build URLs for both authenticated and legacy endpoints
    const verb = thumbnail ? 'thumbnail' : 'download'
    const authPath = `/_matrix/client/v1/media/${verb}/${serverName}/${mediaId}`
    const legacyPath = `/_matrix/media/v3/${verb}/${serverName}/${mediaId}`

    const params = thumbnail
      ? `?width=${thumbnail.width}&height=${thumbnail.height}&method=${method}`
      : ''

    const headers = { Authorization: `Bearer ${accessToken}` }

    // Try authenticated endpoint first
    let response: Response
    try {
      response = await fetch(`${homeserverUrl}${authPath}${params}`, { headers })
      if (!response.ok)
        throw new Error(`${response.status}`)
    }
    catch {
      // Fallback to legacy endpoint
      response = await fetch(`${homeserverUrl}${legacyPath}${params}`, { headers })
      if (!response.ok)
        throw new Error(`Failed to fetch media: ${response.status}`)
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    blobCache.set(cacheKey, blobUrl)
    return blobUrl
  })()

  pendingFetches.set(cacheKey, fetchPromise)
  fetchPromise.finally(() => pendingFetches.delete(cacheKey))

  return fetchPromise
}

/**
 * Hook to resolve an MXC URL to a displayable blob URL via authenticated fetch.
 * Returns the blob URL (or the original URL for blob:// URLs).
 * Returns empty string while loading.
 */
export function useMediaUrl(
  mxcUrl: string | undefined,
  thumbnail?: { width: number, height: number, method?: 'crop' | 'scale' },
): string {
  const homeserverUrl = useAuthStore(s => s.session?.homeserverUrl ?? '')
  const accessToken = useAuthStore(s => s.session?.accessToken ?? '')
  const [blobUrl, setBlobUrl] = useState<string>('')

  const thumbWidth = thumbnail?.width
  const thumbHeight = thumbnail?.height
  const thumbMethod = thumbnail?.method

  useEffect(() => {
    if (!mxcUrl) {
      setBlobUrl('')
      return
    }

    // Blob URLs (local previews) pass through directly
    if (mxcUrl.startsWith('blob:')) {
      setBlobUrl(mxcUrl)
      return
    }

    // Non-MXC URLs pass through directly
    if (!mxcUrl.startsWith('mxc://')) {
      setBlobUrl(mxcUrl)
      return
    }

    if (!homeserverUrl || !accessToken) {
      setBlobUrl('')
      return
    }

    const thumb = thumbWidth && thumbHeight
      ? { width: thumbWidth, height: thumbHeight, method: thumbMethod } as const
      : undefined

    // Check cache synchronously
    const cacheKey = mxcUrl + (thumb ? `?t=${thumb.width}x${thumb.height}` : '')
    const cached = blobCache.get(cacheKey)
    if (cached) {
      setBlobUrl(cached)
      return
    }

    let cancelled = false
    fetchMediaBlob(mxcUrl, homeserverUrl, accessToken, thumb)
      .then((url) => {
        if (!cancelled)
          setBlobUrl(url)
      })
      .catch(() => {
        if (!cancelled)
          setBlobUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [mxcUrl, homeserverUrl, accessToken, thumbWidth, thumbHeight, thumbMethod])

  return blobUrl
}
