import { Download, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export function Lightbox({ src, alt, onClose }: LightboxProps) {
  const { t } = useTranslation()
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(s + 0.5, 5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(s - 0.5, 0.5))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation(r => (r + 90) % 360)
  }, [])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = src
    a.download = alt || 'image'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [src, alt])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(Math.max(s + (e.deltaY > 0 ? -0.2 : 0.2), 0.5), 5))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1)
      return
    setDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [scale, offset])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging)
      return
    setOffset({
      x: dragStartRef.current.ox + e.clientX - dragStartRef.current.x,
      y: dragStartRef.current.oy + e.clientY - dragStartRef.current.y,
    })
  }, [dragging])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  const handleReset = useCallback(() => {
    setScale(1)
    setRotation(0)
    setOffset({ x: 0, y: 0 })
  }, [])

  const lightbox = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/95">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="truncate text-sm text-white/70">{alt}</p>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={handleZoomIn}
                aria-label={t('lightbox.zoom_in')}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('lightbox.zoom_in')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={handleZoomOut}
                aria-label={t('lightbox.zoom_out')}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('lightbox.zoom_out')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={handleRotate}
                aria-label={t('lightbox.rotate')}
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('lightbox.rotate')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={handleDownload}
                aria-label={t('lightbox.download')}
              >
                <Download className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('lightbox.download')}</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-2 h-5 bg-white/20" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label={t('lightbox.close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="relative flex-1 overflow-hidden"
        onWheel={handleWheel}
      >
        {/* Click-to-close backdrop */}
        <button
          type="button"
          className="absolute inset-0 z-0 cursor-default"
          onClick={onClose}
          aria-label={t('lightbox.close')}
        />
        <div className="pointer-events-none relative z-10 flex h-full w-full items-center justify-center">
          <img
            src={src}
            alt={alt}
            className="pointer-events-auto max-h-full max-w-full select-none object-contain transition-transform duration-150"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
              cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
            }}
            draggable={false}
            onDoubleClick={handleReset}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(lightbox, document.body)
}
