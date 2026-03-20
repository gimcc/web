import { Download, FileText, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PdfViewerProps {
  src: string
  filename: string
  onClose: () => void
}

export function PdfViewer({ src, filename, onClose }: PdfViewerProps) {
  const { t } = useTranslation()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape')
      onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-medium">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={src}
            download={filename}
            className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label={t('pdf_viewer.download')}
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 px-4 pb-4">
        <iframe
          src={`${src}#toolbar=1`}
          title={filename}
          className="h-full w-full rounded-lg bg-white"
          // eslint-disable-next-line react-dom/no-unsafe-iframe-sandbox
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  )
}

interface PdfPreviewProps {
  src: string | undefined
  filename: string
  fileSize?: number
}

export function PdfPreview({ src, filename, fileSize }: PdfPreviewProps) {
  const { t } = useTranslation()
  const [viewerOpen, setViewerOpen] = useState(false)

  if (!src)
    return null

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5 transition-colors hover:bg-muted"
      >
        <FileText className="h-8 w-8 shrink-0 text-red-500" />
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-medium text-foreground">{filename}</p>
          <p className="text-xs text-muted-foreground">
            {t('pdf_viewer.click_to_view')}
            {fileSize ? ` \u00B7 ${(fileSize / 1024 / 1024).toFixed(1)} MB` : ''}
          </p>
        </div>
      </button>

      {viewerOpen && (
        <PdfViewer
          src={src}
          filename={filename}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
