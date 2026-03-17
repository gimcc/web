import type { TimelineMessage } from '../stores/messages-store'
import { EventType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useMessagesStore } from '../stores/messages-store'

let tempIdCounter = 0

function generateTempEventId(): string {
  return `~upload-${Date.now()}-${++tempIdCounter}`
}

function detectMsgtype(mimetype: string): string {
  if (mimetype.startsWith('image/'))
    return 'm.image'
  if (mimetype.startsWith('video/'))
    return 'm.video'
  if (mimetype.startsWith('audio/'))
    return 'm.audio'
  return 'm.file'
}

export interface UploadOptions {
  roomId: string
  file: File
  caption?: string
  onProgress?: (loaded: number, total: number) => void
}

export interface UploadResult {
  mxcUrl: string
  eventId: string
}

export async function uploadAndSendFile(options: UploadOptions): Promise<UploadResult> {
  const { roomId, file, caption, onProgress } = options
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const msgtype = detectMsgtype(file.type)
  const tempEventId = generateTempEventId()
  const userId = client.getUserId() ?? ''
  const room = client.getRoom(roomId)
  const member = room?.getMember(userId)

  // Create optimistic message with local blob URL
  const localUrl = URL.createObjectURL(file)
  const optimistic: TimelineMessage = {
    eventId: tempEventId,
    roomId,
    senderId: userId,
    senderName: member?.name ?? userId,
    type: 'm.room.message',
    msgtype,
    body: caption ?? file.name,
    timestamp: Date.now(),
    status: 'sending',
    url: localUrl,
    info: {
      size: file.size,
      mimetype: file.type,
    },
    filename: file.name,
  }

  // Add image dimensions if available
  if (msgtype === 'm.image') {
    try {
      const dimensions = await getImageDimensions(file)
      optimistic.info = { ...optimistic.info, ...dimensions }
    }
    catch {
      // Ignore dimension detection errors
    }
  }

  useMessagesStore.getState().addOptimisticMessage(optimistic)

  try {
    // Upload file to Matrix media repo
    const uploadResponse = await client.uploadContent(file, {
      name: file.name,
      type: file.type,
      progressHandler: onProgress
        ? (progress: { loaded: number, total: number }) => {
            onProgress(progress.loaded, progress.total)
          }
        : undefined,
    })

    const mxcUrl = uploadResponse.content_uri

    // Build message content
    const content: Record<string, unknown> = {
      msgtype,
      body: caption ?? file.name,
      url: mxcUrl,
      info: {
        size: file.size,
        mimetype: file.type,
        ...(optimistic.info?.w ? { w: optimistic.info.w, h: optimistic.info.h } : {}),
      },
    }

    if (file.name !== (caption ?? file.name)) {
      content.filename = file.name
    }

    // Generate thumbnail for images
    if (msgtype === 'm.image' && optimistic.info?.w) {
      // Use the image dimensions from earlier
      const info = content.info as Record<string, unknown>
      info.w = optimistic.info.w
      info.h = optimistic.info.h
    }

    const response = await client.sendEvent(roomId, EventType.RoomMessage, content as any)

    // Update message URL to mxc before revoking blob URL
    const httpUrl = mxcToHttpUrl(mxcUrl, client.baseUrl)
    useMessagesStore.getState().confirmMessage(roomId, tempEventId, response.event_id, { url: httpUrl })

    // Clean up blob URL after message URL has been updated
    URL.revokeObjectURL(localUrl)

    return { mxcUrl, eventId: response.event_id }
  }
  catch {
    URL.revokeObjectURL(localUrl)
    useMessagesStore.getState().failMessage(roomId, tempEventId)
    throw new Error('Failed to upload file')
  }
}

function getImageDimensions(file: File): Promise<{ w: number, h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function mxcToHttpUrl(mxcUrl: string, homeserverUrl: string): string {
  if (!mxcUrl.startsWith('mxc://'))
    return mxcUrl

  const [serverName, mediaId] = mxcUrl.slice(6).split('/')
  return `${homeserverUrl}/_matrix/media/v3/download/${serverName}/${mediaId}`
}

export function mxcToThumbnailUrl(
  mxcUrl: string,
  homeserverUrl: string,
  width: number,
  height: number,
  method: 'crop' | 'scale' = 'scale',
): string {
  if (!mxcUrl.startsWith('mxc://'))
    return mxcUrl

  const [serverName, mediaId] = mxcUrl.slice(6).split('/')
  return `${homeserverUrl}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=${method}`
}
