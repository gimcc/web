import type { ISendEventResponse, MatrixClient } from 'matrix-js-sdk'
import type { TimelineMessage } from '../stores/messages-store'
import { EventType } from 'matrix-js-sdk'
import { getMatrixClient } from '../client/client-manager'
import { useTimelineStore } from '../stores/timeline-store'

type SendEventFn = (roomId: string, eventType: string, content: Record<string, unknown>) => Promise<ISendEventResponse>

function getSendEventFn(client: MatrixClient): SendEventFn {
  return client.sendEvent.bind(client) as SendEventFn
}

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

/** In-memory store of File objects for failed upload retry */
const pendingFiles = new Map<string, { file: File, options: Omit<UploadOptions, 'file' | 'onProgress'> }>()

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
    uploadProgress: 0,
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

  // Store file for potential retry
  pendingFiles.set(tempEventId, { file, options: { roomId, caption, msgtype: msgtypeOverride, info: infoOverride } })

  useTimelineStore.getState().addOptimistic(optimistic)

  try {
    const result = await performUpload(client, tempEventId, file, roomId, msgtype, caption, optimistic, infoOverride, onProgress)
    pendingFiles.delete(tempEventId)
    return result
  }
  catch (err) {
    // Keep blob URL alive for retry — don't revoke
    useTimelineStore.getState().failOptimistic(roomId, tempEventId)
    console.error('[upload] Failed to upload file:', err)
    throw err instanceof Error ? err : new Error('Failed to upload file')
  }
}

/**
 * Retry a failed upload from the timeline.
 * The File object must still be in the pendingFiles map.
 */
export async function resendUpload(roomId: string, tempEventId: string): Promise<void> {
  const entry = pendingFiles.get(tempEventId)
  if (!entry)
    return

  const client = getMatrixClient()
  if (!client)
    return

  const store = useTimelineStore.getState()
  store.updateOptimistic(roomId, tempEventId, { status: 'sending', uploadProgress: 0 })

  try {
    const msgtype = entry.options.msgtype ?? detectMsgtype(entry.file.type)
    const optimisticList = store.optimistic.get(roomId) ?? []
    const optimistic = optimisticList.find(m => m.eventId === tempEventId)

    await performUpload(client, tempEventId, entry.file, roomId, msgtype, entry.options.caption, optimistic ?? null, entry.options.info)
    pendingFiles.delete(tempEventId)
  }
  catch {
    store.failOptimistic(roomId, tempEventId)
  }
}

async function performUpload(
  client: MatrixClient,
  tempEventId: string,
  file: File,
  roomId: string,
  msgtype: string,
  caption: string | undefined,
  optimistic: TimelineMessage | null,
  infoOverride: Record<string, unknown> | undefined,
  onProgress?: (loaded: number, total: number) => void,
): Promise<UploadResult> {
  const store = useTimelineStore.getState()

  const handleProgress = (loaded: number, total: number) => {
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
    store.updateOptimistic(roomId, tempEventId, { uploadProgress: pct })
    onProgress?.(loaded, total)
  }

  let mxcUrl: string

  try {
    const uploadResponse = await client.uploadContent(file, {
      name: file.name,
      type: file.type,
      progressHandler: (progress: { loaded: number, total: number }) =>
        handleProgress(progress.loaded, progress.total),
    })
    mxcUrl = uploadResponse.content_uri
  }
  catch {
    // Fallback: authenticated upload endpoint
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

  // Mark progress complete
  store.updateOptimistic(roomId, tempEventId, { uploadProgress: 100 })

  const content: Record<string, unknown> = {
    msgtype,
    body: caption ?? file.name,
    url: mxcUrl,
    info: {
      size: file.size,
      mimetype: file.type,
      ...(optimistic?.info?.w ? { w: optimistic.info.w, h: optimistic.info.h } : {}),
      ...infoOverride,
    },
  }

  if (file.name !== (caption ?? file.name)) {
    content.filename = file.name
  }

  if (msgtype === 'm.image' && optimistic?.info?.w) {
    const info = content.info as Record<string, unknown>
    info.w = optimistic.info.w
    info.h = optimistic.info.h
  }

  const response = await getSendEventFn(client)(roomId, EventType.RoomMessage, content as Record<string, unknown>)
  store.confirmOptimistic(roomId, tempEventId, response.event_id)

  // Defer blob revocation so the reader re-reads the SDK event first
  const localUrl = optimistic?.url
  if (localUrl) {
    setTimeout(() => URL.revokeObjectURL(localUrl), 0)
  }

  return { mxcUrl, eventId: response.event_id }
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
  const parts = mxcUrl.slice(6).split('/')
  const serverName = parts[0]
  const mediaId = parts[1]
  if (!serverName || !mediaId)
    return mxcUrl
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
  const parts = mxcUrl.slice(6).split('/')
  const serverName = parts[0]
  const mediaId = parts[1]
  if (!serverName || !mediaId)
    return mxcUrl
  return `${homeserverUrl}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=${method}`
}
