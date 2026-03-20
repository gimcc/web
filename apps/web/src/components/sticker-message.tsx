import type { TimelineMessageItem } from '@matrix-web/matrix-client'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useMediaUrl } from '../hooks/use-media-url'
import { cn } from '../lib/utils'
import { Lightbox } from './lightbox'

interface StickerMessageProps {
  message: TimelineMessageItem
}

const STICKER_SIZE = { width: 256, height: 256 }

export function StickerMessage({ message }: StickerMessageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const thumbnailSrc = useMediaUrl(message.url, STICKER_SIZE)
  const fullSrc = useMediaUrl(message.url)

  const maxSize = 200
  const w = message.info?.w ?? maxSize
  const h = message.info?.h ?? maxSize
  const scale = Math.min(maxSize / w, maxSize / h, 1)
  const displayW = Math.round(w * scale)
  const displayH = Math.round(h * scale)

  return (
    <>
      <button
        type="button"
        className="block"
        onClick={() => setLightboxOpen(true)}
        style={{ width: displayW, height: displayH }}
      >
        {thumbnailSrc || fullSrc
          ? (
              <img
                src={thumbnailSrc || fullSrc}
                alt={message.body}
                className={cn(
                  'object-contain',
                  message.status === 'sending' && 'opacity-60',
                )}
                style={{ width: displayW, height: displayH }}
                loading="lazy"
              />
            )
          : (
              <div
                className={cn(
                  'flex items-center justify-center',
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
