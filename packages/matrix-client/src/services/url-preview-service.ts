import { getMatrixClient } from '../client/client-manager'

export interface UrlPreview {
  url: string
  title?: string
  description?: string
  imageUrl?: string
  siteName?: string
}

const previewCache = new Map<string, UrlPreview | null>()

/**
 * Fetch URL preview metadata using the Matrix homeserver's preview_url API.
 */
export async function fetchUrlPreview(url: string): Promise<UrlPreview | null> {
  if (previewCache.has(url)) {
    return previewCache.get(url) ?? null
  }

  const client = getMatrixClient()
  if (!client)
    return null

  try {
    const response = await client.getUrlPreview(url, Date.now())

    if (!response || (!response['og:title'] && !response['og:description'])) {
      previewCache.set(url, null)
      return null
    }

    let imageUrl: string | undefined
    const ogImage = response['og:image'] as string | undefined
    if (ogImage && ogImage.startsWith('mxc://')) {
      const baseUrl = client.getHomeserverUrl()
      const parts = ogImage.slice(6).split('/')
      imageUrl = `${baseUrl}/_matrix/media/v3/thumbnail/${parts[0]}/${parts[1]}?width=320&height=200&method=scale`
    }
    else if (ogImage) {
      imageUrl = ogImage
    }

    const preview: UrlPreview = {
      url,
      title: response['og:title'] as string | undefined,
      description: response['og:description'] as string | undefined,
      imageUrl,
      siteName: response['og:site_name'] as string | undefined,
    }

    previewCache.set(url, preview)
    return preview
  }
  catch {
    previewCache.set(url, null)
    return null
  }
}

const URL_REGEX = /https?:\/\/[^\s<]+/g

/**
 * Extract URLs from a message body.
 */
export function extractUrls(body: string): string[] {
  const matches = body.match(URL_REGEX)
  return matches ? [...new Set(matches)] : []
}
