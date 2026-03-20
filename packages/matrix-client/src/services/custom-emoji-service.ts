import { getMatrixClient } from '../client/client-manager'

/**
 * Raw image entry in an im.ponies emoji pack.
 */
export interface EmojiPackImage {
  url: string // mxc:// URL
  body?: string
  usage?: string[] // ['emoticon'] or ['sticker'] or both
  info?: {
    w?: number
    h?: number
    mimetype?: string
    size?: number
  }
}

/**
 * Raw emoji pack content from Matrix state events.
 */
export interface EmojiPackContent {
  pack?: {
    display_name?: string
    avatar_url?: string
    usage?: string[]
  }
  images?: Record<string, EmojiPackImage>
}

/**
 * Resolved emoji pack with HTTP URLs.
 */
export interface ResolvedEmojiPack {
  id: string
  name: string
  avatarUrl?: string
  images: Array<{
    shortcode: string
    url: string // HTTP URL
    body?: string
    isSticker: boolean
    info?: EmojiPackImage['info']
  }>
}

/**
 * Convert an mxc:// URL to an HTTP URL using the current client's homeserver.
 */
function mxcToHttp(mxcUrl: string, homeserverUrl: string): string {
  if (!mxcUrl.startsWith('mxc://')) return mxcUrl
  const [serverName, mediaId] = mxcUrl.slice(6).split('/')
  return `${homeserverUrl}/_matrix/media/v3/download/${serverName}/${mediaId}`
}

function mxcToThumbnail(mxcUrl: string, homeserverUrl: string, width: number, height: number): string {
  if (!mxcUrl.startsWith('mxc://')) return mxcUrl
  const [serverName, mediaId] = mxcUrl.slice(6).split('/')
  return `${homeserverUrl}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=scale`
}

/**
 * Resolve a raw EmojiPackContent into a usable ResolvedEmojiPack.
 */
function resolvePackContent(
  id: string,
  content: EmojiPackContent,
  homeserverUrl: string,
): ResolvedEmojiPack {
  const packMeta = content.pack ?? {}
  const images = content.images ?? {}

  const resolvedImages = Object.entries(images).map(([shortcode, img]) => {
    const usage = img.usage ?? packMeta.usage ?? ['emoticon']
    const isSticker = usage.includes('sticker')
    return {
      shortcode,
      url: mxcToThumbnail(img.url, homeserverUrl, isSticker ? 256 : 64, isSticker ? 256 : 64),
      body: img.body ?? shortcode,
      isSticker,
      info: img.info,
    }
  })

  return {
    id,
    name: packMeta.display_name ?? id,
    avatarUrl: packMeta.avatar_url ? mxcToThumbnail(packMeta.avatar_url, homeserverUrl, 32, 32) : undefined,
    images: resolvedImages,
  }
}

/**
 * Get custom emoji packs from user account data.
 * Reads `im.ponies.user_emotes` from account data.
 */
export function getUserEmojiPacks(): ResolvedEmojiPack[] {
  const client = getMatrixClient()
  if (!client) return []

  const homeserverUrl = client.baseUrl

  // Try user account data
  const userEmotes = client.getAccountData('im.ponies.user_emotes')
  const packs: ResolvedEmojiPack[] = []

  if (userEmotes) {
    const content = userEmotes.getContent() as EmojiPackContent
    if (content.images && Object.keys(content.images).length > 0) {
      packs.push(resolvePackContent('user_emotes', content, homeserverUrl))
    }
  }

  return packs
}

/**
 * Get custom emoji packs from a room's state events.
 * Reads `im.ponies.room_emotes` state events with various state keys.
 */
export function getRoomEmojiPacks(roomId: string): ResolvedEmojiPack[] {
  const client = getMatrixClient()
  if (!client) return []

  const homeserverUrl = client.baseUrl
  const room = client.getRoom(roomId)
  if (!room) return []

  const packs: ResolvedEmojiPack[] = []

  // Get all im.ponies.room_emotes state events
  const stateEvents = room.currentState.getStateEvents('im.ponies.room_emotes')
  for (const event of stateEvents) {
    const stateKey = event.getStateKey() ?? ''
    const content = event.getContent() as EmojiPackContent
    if (content.images && Object.keys(content.images).length > 0) {
      packs.push(resolvePackContent(stateKey || 'room_emotes', content, homeserverUrl))
    }
  }

  return packs
}

/**
 * Get all available emoji packs (user + room).
 */
export function getAllEmojiPacks(roomId?: string): ResolvedEmojiPack[] {
  const packs = getUserEmojiPacks()
  if (roomId) {
    packs.push(...getRoomEmojiPacks(roomId))
  }
  return packs
}

/**
 * Get sticker packs (filtered to only sticker-usage images).
 */
export function getStickerPacks(roomId?: string): ResolvedEmojiPack[] {
  const allPacks = getAllEmojiPacks(roomId)
  return allPacks
    .map(pack => ({
      ...pack,
      images: pack.images.filter(img => img.isSticker),
    }))
    .filter(pack => pack.images.length > 0)
}

/**
 * Get the full MXC URL for a sticker (for sending).
 */
export function getStickerMxcUrl(shortcode: string, roomId?: string): string | null {
  const client = getMatrixClient()
  if (!client) return null

  // Search user emotes
  const userEmotes = client.getAccountData('im.ponies.user_emotes')
  if (userEmotes) {
    const content = userEmotes.getContent() as EmojiPackContent
    const img = content.images?.[shortcode]
    if (img) return img.url
  }

  // Search room emotes
  if (roomId) {
    const room = client.getRoom(roomId)
    if (room) {
      const stateEvents = room.currentState.getStateEvents('im.ponies.room_emotes')
      for (const event of stateEvents) {
        const content = event.getContent() as EmojiPackContent
        const img = content.images?.[shortcode]
        if (img) return img.url
      }
    }
  }

  return null
}
