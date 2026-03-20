import type { TimelineMessage } from '../stores/messages-store'
import { EventType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useTimelineStore } from '../stores/timeline-store'

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
  msgtype?: string
  info?: Record<string, unknown>
  onProgress?: (loaded: number, total: number) => void
}

export interface UploadResult {
  mxcUrl: string
  eventId: string
}

export async function uploadAndSendFile(options: UploadOptions): Promise<UploadResult> {
  const { roomId, file, caption, onProgress, msgtype: msgtypeOverride, info: infoOverride } = options
  const client = getMatrixClient()
  if (!client)
    throw new Error('Matrix client not initialized')

  const msgtype = msgtypeOverride ?? detectMsgtype(file.type)
  const tempEventId = generateTempEventId()
  const userId = client.getUserId() ?? ''
  const room = client.getRoom(roomId)
  const member = room?.getMember(userId)

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
    info: { size: file.size, mimetype: file.type, ...infoOverride },
    filename: file.name,
  }

  if (msgtype === 'm.image') {
    try {
      const dimensions = await getImageDimensions(file)
      optimistic.info = { ...optimistic.info, ...dimensions }
    }
    catch { /* ignore */ }
  }

  useTimelineStore.getState().addOptimistic(optimistic)

  try {
    let mxcUrl: string

    try {
      // Primary: use SDK upload (/_matrix/media/v3/upload)
      const uploadResponse = await client.uploadContent(file, {
        name: file.name,
        type: file.type,
        progressHandler: onProgress
          ? (progress: { loaded: number, total: number }) => onProgress(progress.loaded, progress.total)
          : undefined,
      })
      mxcUrl = uploadResponse.content_uri
    }
    catch {
      // Fallback: try authenticated upload endpoint (/_matrix/client/v1/media/upload)
      const url = new URL('/_matrix/client/v1/media/upload', client.baseUrl)
      url.searchParams.set('filename', encodeURIComponent(file.name))

      const response = await fetch(url.href, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.getAccessToken()}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(`Upload failed (${response.status}): ${errorBody}`)
      }

      const result = await response.json() as { content_uri: string }
      mxcUrl = result.content_uri
    }

    const content: Record<string, unknown> = {
      msgtype,
      body: caption ?? file.name,
      url: mxcUrl,
      info: {
        size: file.size,
        mimetype: file.type,
        ...(optimistic.info?.w ? { w: optimistic.info.w, h: optimistic.info.h } : {}),
        ...infoOverride,
      },
    }

    if (file.name !== (caption ?? file.name)) {
      content.filename = file.name
    }

    if (msgtype === 'm.image' && optimistic.info?.w) {
      const info = content.info as Record<string, unknown>
      info.w = optimistic.info.w
      info.h = optimistic.info.h
    }

    const response = await client.sendEvent(roomId, EventType.RoomMessage, content as any)
    useTimelineStore.getState().confirmOptimistic(roomId, tempEventId, response.event_id)
    // Defer blob revocation to next tick so the reader re-reads the SDK event
    // (which has the MXC URL) before the blob URL becomes invalid
    setTimeout(() => URL.revokeObjectURL(localUrl), 0)

    return { mxcUrl, eventId: response.event_id }
  }
  catch (err) {
    URL.revokeObjectURL(localUrl)
    useTimelineStore.getState().failOptimistic(roomId, tempEventId)
    console.error('[upload] Failed to upload file:', err)
    throw err instanceof Error ? err : new Error('Failed to upload file')
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
