import type { TimelineMessage } from '../stores/messages-store'
import { getMatrixClient } from '../client/client-manager'
import { useTimelineStore } from '../stores/timeline-store'

let tempIdCounter = 0

function generateTempEventId(): string {
  return `~sticker-${Date.now()}-${++tempIdCounter}`
}

export interface SendStickerOptions {
  roomId: string
  /** mxc:// URL of the sticker image */
  url: string
  /** Body text (sticker name / shortcode) */
  body: string
  /** Image info */
  info?: {
    w?: number
    h?: number
    mimetype?: string
    size?: number
    thumbnail_url?: string
    thumbnail_info?: { w?: number, h?: number, mimetype?: string, size?: number }
  }
}

/**
 * Send a sticker message (m.sticker event type).
 */
export async function sendSticker(options: SendStickerOptions): Promise<void> {
  const { roomId, url, body, info } = options
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const tempEventId = generateTempEventId()
  const userId = client.getUserId() ?? ''
  const room = client.getRoom(roomId)
  const member = room?.getMember(userId)

  // Resolve mxc URL to HTTP for optimistic preview
  let previewUrl = url
  if (url.startsWith('mxc://')) {
    const [serverName, mediaId] = url.slice(6).split('/')
    previewUrl = `${client.baseUrl}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=256&height=256&method=scale`
  }

  const optimistic: TimelineMessage = {
    eventId: tempEventId,
    roomId,
    senderId: userId,
    senderName: member?.name ?? userId,
    type: 'm.sticker',
    msgtype: 'm.sticker',
    body,
    timestamp: Date.now(),
    status: 'sending',
    url: previewUrl,
    info: info ?? { w: 256, h: 256, mimetype: 'image/png' },
  }

  useTimelineStore.getState().addOptimistic(optimistic)

  try {
    const content: Record<string, unknown> = {
      body,
      url,
      info: info ?? { w: 256, h: 256, mimetype: 'image/png' },
    }

    // m.sticker is its own event type, not a msgtype under m.room.message
    const response = await client.sendEvent(roomId, 'm.sticker' as any, content)
    useTimelineStore.getState().confirmOptimistic(roomId, tempEventId, response.event_id)
  }
  catch {
    useTimelineStore.getState().failOptimistic(roomId, tempEventId)
  }
}
