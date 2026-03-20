import type { TimelineMessage } from '@matrix-web/matrix-client'
import { useAuthStore } from '@matrix-web/matrix-client'
import { Download, File, Loader2, Play } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMediaUrl } from '../hooks/use-media-url'
import { formatFileSize } from '../lib/format'
import { cn } from '../lib/utils'
import { Lightbox } from './lightbox'
import { PdfPreview } from './pdf-viewer'
import { VoicePlayer } from './voice-player'

interface MediaMessageProps {
  message: TimelineMessage
}

const THUMBNAIL_SIZE = { width: 400, height: 400 }

function ImageMessage({ message }: MediaMessageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const thumbnailSrc = useMediaUrl(message.url, THUMBNAIL_SIZE)
  const fullSrc = useMediaUrl(message.url)

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
        {thumbnailSrc || fullSrc
          ? (
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
            )
          : (
              <div
                className={cn(
                  'flex items-center justify-center rounded-lg bg-muted',
                  message.status === 'sending' && 'opacity-60',
                )}
                style={{ width: displayW, height: displayH }}
              >
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
      </button>

      {lightboxOpen && fullSrc && (
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
  const [playing, setPlaying] = useState(false)

  const videoSrc = useMediaUrl(message.url)
  const thumbnailSrc = useMediaUrl(message.thumbnailUrl, THUMBNAIL_SIZE)

  const maxWidth = 400

  if (playing && videoSrc) {
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
  const accessToken = useAuthStore(s => s.session?.accessToken ?? '')

  const handleDownload = useCallback(async () => {
    if (!message.url)
      return

    // For blob URLs, open directly
    if (message.url.startsWith('blob:')) {
      const a = document.createElement('a')
      a.href = message.url
      a.download = message.filename ?? message.body
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }

    // For MXC URLs, fetch with authentication
    if (message.url.startsWith('mxc://') && homeserverUrl && accessToken) {
      const [serverName, mediaId] = message.url.slice(6).split('/')
      const headers = { Authorization: `Bearer ${accessToken}` }

      let response: Response
      try {
        response = await fetch(
          `${homeserverUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}`,
          { headers },
        )
        if (!response.ok)
          throw new Error(`${response.status}`)
      }
      catch {
        response = await fetch(
          `${homeserverUrl}/_matrix/media/v3/download/${serverName}/${mediaId}`,
          { headers },
        )
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = message.filename ?? message.body
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    }
  }, [message.url, message.filename, message.body, homeserverUrl, accessToken])

  return (
    <button
      type="button"
      className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 transition-colors hover:bg-muted"
      onClick={() => void handleDownload()}
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

function AudioMessage({ message }: MediaMessageProps) {
  const audioSrc = useMediaUrl(message.url)

  if (!audioSrc)
    return null

  return (
    <div className="mt-1 max-w-[320px]">
      <VoicePlayer url={audioSrc} duration={message.info?.duration} />
    </div>
  )
}

function PdfMessage({ message }: MediaMessageProps) {
  const src = useMediaUrl(message.url)
  return (
    <PdfPreview
      src={src}
      filename={message.filename ?? message.body}
      fileSize={message.info?.size}
    />
  )
}

function isPdfFile(message: TimelineMessage): boolean {
  return message.msgtype === 'm.file'
    && (message.info?.mimetype === 'application/pdf'
      || (message.filename ?? message.body).toLowerCase().endsWith('.pdf'))
}

export function MediaMessage({ message }: MediaMessageProps) {
  const { t } = useTranslation()

  if (message.status === 'sending' && !message.url) {
    return (
      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('chat.uploading')}
      </div>
    )
  }

  if (isPdfFile(message)) {
    return <PdfMessage message={message} />
  }

  switch (message.msgtype) {
    case 'm.image':
      return <ImageMessage message={message} />
    case 'm.video':
      return <VideoMessage message={message} />
    case 'm.audio':
      return <AudioMessage message={message} />
    case 'm.file':
      return <FileMessage message={message} />
    default:
      return <FileMessage message={message} />
  }
}
