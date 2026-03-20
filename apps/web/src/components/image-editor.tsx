import { Check, Crop, Minus, Palette, Pencil, RotateCcw, Type, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

interface ImageEditorProps {
  imageUrl: string
  onSave: (blob: Blob) => void
  onCancel: () => void
}

type Tool = 'crop' | 'draw' | 'text'

const COLORS = ['#ff0000', '#00ff00', '#0066ff', '#ffff00', '#ff00ff', '#ffffff', '#000000']
const STROKE_WIDTHS = [2, 4, 8]

interface DrawPath {
  points: Array<{ x: number, y: number }>
  color: string
  width: number
}

interface TextAnnotation {
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

export function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<Tool | null>(null)
  const [color, setColor] = useState('#ff0000')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [paths, setPaths] = useState<DrawPath[]>([])
  const [currentPath, setCurrentPath] = useState<DrawPath | null>(null)
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([])
  const [pendingText, setPendingText] = useState<{ x: number, y: number } | null>(null)
  const [textInput, setTextInput] = useState('')
  const [loaded, setLoaded] = useState(false)

  // Crop state
  const [cropStart, setCropStart] = useState<{ x: number, y: number } | null>(null)
  const [cropEnd, setCropEnd] = useState<{ x: number, y: number } | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setLoaded(true)
    }
    img.src = imageUrl
  }, [imageUrl])

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    ctx.drawImage(img, 0, 0)

    // Draw paths
    for (const path of paths) {
      if (path.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = path.color
      ctx.lineWidth = path.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(path.points[0]!.x, path.points[0]!.y)
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i]!.x, path.points[i]!.y)
      }
      ctx.stroke()
    }

    // Draw current path
    if (currentPath && currentPath.points.length >= 2) {
      ctx.beginPath()
      ctx.strokeStyle = currentPath.color
      ctx.lineWidth = currentPath.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(currentPath.points[0]!.x, currentPath.points[0]!.y)
      for (let i = 1; i < currentPath.points.length; i++) {
        ctx.lineTo(currentPath.points[i]!.x, currentPath.points[i]!.y)
      }
      ctx.stroke()
    }

    // Draw text annotations
    for (const ann of textAnnotations) {
      ctx.font = `${ann.fontSize}px sans-serif`
      ctx.fillStyle = ann.color
      ctx.fillText(ann.text, ann.x, ann.y)
    }

    // Draw crop overlay
    if (cropStart && cropEnd) {
      const x = Math.min(cropStart.x, cropEnd.x)
      const y = Math.min(cropStart.y, cropEnd.y)
      const w = Math.abs(cropEnd.x - cropStart.x)
      const h = Math.abs(cropEnd.y - cropStart.y)

      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      // Top
      ctx.fillRect(0, 0, canvas.width, y)
      // Bottom
      ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h)
      // Left
      ctx.fillRect(0, y, x, h)
      // Right
      ctx.fillRect(x + w, y, canvas.width - x - w, h)

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }
  }, [paths, currentPath, textAnnotations, cropStart, cropEnd])

  useEffect(() => {
    if (loaded) renderCanvas()
  }, [loaded, renderCanvas])

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e)

    if (tool === 'draw') {
      setIsDrawing(true)
      setCurrentPath({ points: [coords], color, width: strokeWidth })
    } else if (tool === 'crop') {
      setIsCropping(true)
      setCropStart(coords)
      setCropEnd(coords)
    } else if (tool === 'text') {
      setPendingText(coords)
      setTextInput('')
    }
  }, [tool, color, strokeWidth, getCanvasCoords])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'draw' && isDrawing && currentPath) {
      const coords = getCanvasCoords(e)
      setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, coords] } : null)
    } else if (tool === 'crop' && isCropping) {
      const coords = getCanvasCoords(e)
      setCropEnd(coords)
    }
  }, [tool, isDrawing, isCropping, currentPath, getCanvasCoords])

  const handleMouseUp = useCallback(() => {
    if (tool === 'draw' && isDrawing && currentPath) {
      setPaths(prev => [...prev, currentPath])
      setCurrentPath(null)
      setIsDrawing(false)
    } else if (tool === 'crop' && isCropping) {
      setIsCropping(false)
    }
  }, [tool, isDrawing, isCropping, currentPath])

  const handleApplyCrop = useCallback(() => {
    if (!cropStart || !cropEnd || !imageRef.current) return

    const x = Math.min(cropStart.x, cropEnd.x)
    const y = Math.min(cropStart.y, cropEnd.y)
    const w = Math.abs(cropEnd.x - cropStart.x)
    const h = Math.abs(cropEnd.y - cropStart.y)

    if (w < 10 || h < 10) return

    // Create a temporary canvas to crop
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w
    tempCanvas.height = h
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) return

    // Draw the cropped region
    tempCtx.drawImage(canvasRef.current!, x, y, w, h, 0, 0, w, h)

    // Create a new image from cropped data
    const croppedImg = new Image()
    croppedImg.onload = () => {
      imageRef.current = croppedImg
      setPaths([])
      setTextAnnotations([])
      setCropStart(null)
      setCropEnd(null)
      setTool(null)
      renderCanvas()
    }
    croppedImg.src = tempCanvas.toDataURL()
  }, [cropStart, cropEnd, renderCanvas])

  const handleAddText = useCallback(() => {
    if (!pendingText || !textInput.trim()) return
    setTextAnnotations(prev => [
      ...prev,
      {
        x: pendingText.x,
        y: pendingText.y,
        text: textInput,
        color,
        fontSize: 24,
      },
    ])
    setPendingText(null)
    setTextInput('')
  }, [pendingText, textInput, color])

  const handleReset = useCallback(() => {
    setPaths([])
    setTextAnnotations([])
    setCropStart(null)
    setCropEnd(null)
    setTool(null)
    renderCanvas()
  }, [renderCanvas])

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Re-render without crop overlay
    const savedCropStart = cropStart
    const savedCropEnd = cropEnd
    setCropStart(null)
    setCropEnd(null)

    // Need to render without crop overlay before saving
    setTimeout(() => {
      canvas.toBlob((blob) => {
        if (blob) onSave(blob)
      }, 'image/png')

      // Restore crop overlay state
      setCropStart(savedCropStart)
      setCropEnd(savedCropEnd)
    }, 50)
  }, [onSave, cropStart, cropEnd])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{t('image_editor.title')}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Tools */}
          <button
            type="button"
            onClick={() => { setTool(tool === 'crop' ? null : 'crop'); setCropStart(null); setCropEnd(null) }}
            className={cn(
              'rounded-md p-2 transition-colors',
              tool === 'crop' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10',
            )}
            title={t('image_editor.crop')}
          >
            <Crop className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setTool(tool === 'draw' ? null : 'draw')}
            className={cn(
              'rounded-md p-2 transition-colors',
              tool === 'draw' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10',
            )}
            title={t('image_editor.draw')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setTool(tool === 'text' ? null : 'text')}
            className={cn(
              'rounded-md p-2 transition-colors',
              tool === 'text' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10',
            )}
            title={t('image_editor.text')}
          >
            <Type className="h-4 w-4" />
          </button>

          <div className="mx-2 h-5 w-px bg-white/20" />

          {/* Color picker */}
          {(tool === 'draw' || tool === 'text') && (
            <div className="flex items-center gap-1">
              <Palette className="mr-1 h-3.5 w-3.5 text-white/50" />
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 transition-transform',
                    color === c ? 'scale-125 border-white' : 'border-white/30',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          )}

          {/* Stroke width */}
          {tool === 'draw' && (
            <div className="ml-2 flex items-center gap-1">
              {STROKE_WIDTHS.map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setStrokeWidth(w)}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded transition-colors',
                    strokeWidth === w ? 'bg-white/20' : 'hover:bg-white/10',
                  )}
                >
                  <div
                    className="rounded-full bg-white"
                    style={{ width: w + 2, height: w + 2 }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Crop apply */}
          {tool === 'crop' && cropStart && cropEnd && (
            <button
              type="button"
              onClick={handleApplyCrop}
              className="ml-2 rounded-md bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary/80"
            >
              {t('image_editor.apply_crop')}
            </button>
          )}

          <div className="mx-2 h-5 w-px bg-white/20" />

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10"
            title={t('image_editor.reset')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-white/70 hover:bg-white/10"
          >
            <X className="mr-1 inline h-4 w-4" />
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/80"
          >
            <Check className="mr-1 inline h-4 w-4" />
            {t('image_editor.send')}
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full cursor-crosshair"
          style={{ imageRendering: 'auto' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Text input dialog */}
      {pendingText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-background p-4 shadow-xl">
            <label className="mb-2 block text-sm font-medium text-foreground">
              {t('image_editor.text_label')}
            </label>
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddText() }}
              className="mb-3 w-64 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              autoFocus
              placeholder={t('image_editor.text_placeholder')}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingText(null)}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddText}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
              >
                {t('image_editor.add_text')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
