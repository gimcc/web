import type { TimelineMessage } from '@matrix-web/matrix-client'
import { mxcToHttpUrl, mxcToThumbnailUrl, useAuthStore } from '@matrix-web/matrix-client'
import { Download, File, Loader2, Play } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { formatFileSize } from '../lib/format'
import { cn } from '../lib/utils'
import { Lightbox } from './lightbox'

interface MediaMessageProps {
  message: TimelineMessage
}

function getMediaUrl(url: string | undefined, homeserverUrl: string): string {
  if (!url)
    return ''
  // Blob URLs (local previews) pass through
  if (url.startsWith('blob:'))
    return url
  return mxcToHttpUrl(url, homeserverUrl)
}

function getThumbnailUrl(url: string | undefined, homeserverUrl: string): string {
  if (!url)
    return ''
  if (url.startsWith('blob:'))
    return url
  return mxcToThumbnailUrl(url, homeserverUrl, 400, 400)
}

function ImageMessage({ message }: MediaMessageProps) {
  const homeserverUrl = useAuthStore(s => s.session?.homeserverUrl ?? '')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const thumbnailSrc = useMemo(
    () => getThumbnailUrl(message.url, homeserverUrl),
    [message.url, homeserverUrl],
  )
  const fullSrc = useMemo(
    () => getMediaUrl(message.url, homeserverUrl),
    [message.url, homeserverUrl],
  )

  // Calculate constrained dimensions
  const maxWidth = 400
  const maxHeight = 300
  const w = message.info?.w ?? maxWidth
  const h = message.info?.h ?? maxHeight
  const scale = Math.min(maxWidth / w, maxHeight / h, 1)
  const displayW = Math.round(w * scale)
  const displayH = Math.round(h * scale)

  return (
    <>
      <button
        type="button"
        className="mt-1 block overflow-hidden rounded-lg"
        onClick={() => setLightboxOpen(true)}
        style={{ width: displayW, height: displayH }}
      >
        <img
          src={thumbnailSrc || fullSrc}
          alt={message.body}
          className={cn(
            'rounded-lg object-cover',
            message.status === 'sending' && 'opacity-60',
          )}
          style={{ width: displayW, height: displayH }}
          loading="lazy"
        />
      </button>

      {lightboxOpen && (
        <Lightbox
          src={fullSrc}
          alt={message.body}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}

function VideoMessage({ message }: MediaMessageProps) {
  const homeserverUrl = useAuthStore(s => s.session?.homeserverUrl ?? '')
  const [playing, setPlaying] = useState(false)

  const videoSrc = useMemo(
    () => getMediaUrl(message.url, homeserverUrl),
    [message.url, homeserverUrl],
  )
  const thumbnailSrc = useMemo(
    () => message.thumbnailUrl ? getThumbnailUrl(message.thumbnailUrl, homeserverUrl) : '',
    [message.thumbnailUrl, homeserverUrl],
  )

  const maxWidth = 400

  if (playing) {
    return (
      <video
        src={videoSrc}
        controls
        autoPlay
        className="mt-1 max-h-[300px] rounded-lg"
        style={{ maxWidth }}
      >
        <track kind="captions" />
      </video>
    )
  }

  return (
    <button
      type="button"
      className="relative mt-1 block overflow-hidden rounded-lg bg-muted"
      style={{ maxWidth, height: 200 }}
      onClick={() => setPlaying(true)}
    >
      {thumbnailSrc
        ? (
            <img
              src={thumbnailSrc}
              alt={message.body}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )
        : (
            <div className="flex h-full w-full items-center justify-center">
              <Play className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <Play className="h-12 w-12 text-white" fill="white" />
      </div>
    </button>
  )
}

function FileMessage({ message }: MediaMessageProps) {
  const homeserverUrl = useAuthStore(s => s.session?.homeserverUrl ?? '')

  const downloadUrl = useMemo(
    () => getMediaUrl(message.url, homeserverUrl),
    [message.url, homeserverUrl],
  )

  const handleDownload = useCallback(() => {
    if (!downloadUrl)
      return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = message.filename ?? message.body
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [downloadUrl, message.filename, message.body])

  return (
    <button
      type="button"
      className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
      onClick={handleDownload}
    >
      <File className="h-8 w-8 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-medium text-foreground">
          {message.filename ?? message.body}
        </p>
        {message.info?.size && (
          <p className="text-xs text-muted-foreground">
            {formatFileSize(message.info.size)}
          </p>
        )}
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

export function MediaMessage({ message }: MediaMessageProps) {
  if (message.status === 'sending' && !message.url) {
    return (
      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Uploading...
      </div>
    )
  }

  switch (message.msgtype) {
    case 'm.image':
      return <ImageMessage message={message} />
    case 'm.video':
      return <VideoMessage message={message} />
    case 'm.file':
      return <FileMessage message={message} />
    default:
      return <FileMessage message={message} />
  }
}
