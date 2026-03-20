import { FileText, Film, Image as ImageIcon, Music, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatFileSize } from '../lib/format'
import { ImageEditor } from './image-editor'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'

export interface PendingUpload {
  id: string
  file: File
  previewUrl: string
  caption: string
}

interface UploadPreviewProps {
  uploads: PendingUpload[]
  onRemove: (id: string) => void
  onCaptionChange: (id: string, caption: string) => void
  onReplaceFile?: (id: string, file: File) => void
}

function getFileIcon(mimetype: string) {
  if (mimetype.startsWith('image/'))
    return ImageIcon
  if (mimetype.startsWith('video/'))
    return Film
  if (mimetype.startsWith('audio/'))
    return Music
  return FileText
}

function FileChip({ upload, onRemove, onClick }: {
  upload: PendingUpload
  onRemove: () => void
  onClick: () => void
}) {
  const { t } = useTranslation()
  const Icon = getFileIcon(upload.file.type)

  return (
    <div className="group flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5">
      <button
        type="button"
        className="flex items-center gap-1.5 text-left"
        onClick={onClick}
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="max-w-[150px] truncate text-xs font-medium text-foreground">{upload.file.name}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">{formatFileSize(upload.file.size)}</span>
      </button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="ml-0.5 h-5 w-5 shrink-0 rounded-full p-0"
        onClick={onRemove}
        aria-label={t('common.remove')}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

function FilePreviewDialog({ upload, onClose, onEdit }: {
  upload: PendingUpload
  onClose: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const isImage = upload.file.type.startsWith('image/')
  const isVideo = upload.file.type.startsWith('video/')
  const isAudio = upload.file.type.startsWith('audio/')
  const Icon = getFileIcon(upload.file.type)

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="sr-only">{upload.file.name}</DialogTitle>

        {isImage && (
          <img
            src={upload.previewUrl}
            alt={upload.file.name}
            className="max-h-[60vh] w-full rounded-lg object-contain"
          />
        )}

        {isVideo && (
          <video
            src={upload.previewUrl}
            controls
            className="max-h-[60vh] w-full rounded-lg"
          >
            <track kind="captions" />
          </video>
        )}

        {isAudio && (
          <div className="flex items-center gap-3 py-4">
            <Music className="h-8 w-8 text-primary" />
            <audio src={upload.previewUrl} controls className="flex-1" />
          </div>
        )}

        {!isImage && !isVideo && !isAudio && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{upload.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(upload.file.size)}
            {upload.file.type ? ` \u00B7 ${upload.file.type}` : ''}
          </p>
        </div>

        {isImage && onEdit && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              onClose()
              onEdit()
            }}
          >
            {t('image_editor.title')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function UploadPreview({ uploads, onRemove, onCaptionChange, onReplaceFile }: UploadPreviewProps) {
  const [previewUploadId, setPreviewUploadId] = useState<string | null>(null)
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null)

  // Keep onCaptionChange in props for compatibility but chips don't use it directly
  void onCaptionChange

  if (uploads.length === 0 && !editingUploadId)
    return null

  const previewUpload = previewUploadId ? uploads.find(u => u.id === previewUploadId) : null
  const editingUpload = editingUploadId ? uploads.find(u => u.id === editingUploadId) : null

  return (
    <>
      {uploads.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2">
          {uploads.map(upload => (
            <FileChip
              key={upload.id}
              upload={upload}
              onRemove={() => onRemove(upload.id)}
              onClick={() => setPreviewUploadId(upload.id)}
            />
          ))}
        </div>
      )}

      {previewUpload && (
        <FilePreviewDialog
          upload={previewUpload}
          onClose={() => setPreviewUploadId(null)}
          onEdit={previewUpload.file.type.startsWith('image/') && onReplaceFile
            ? () => setEditingUploadId(previewUpload.id)
            : undefined}
        />
      )}

      {editingUpload && (
        <ImageEditor
          imageUrl={editingUpload.previewUrl}
          onSave={(blob) => {
            const editedFile = new File([blob], editingUpload.file.name, { type: 'image/png' })
            onReplaceFile?.(editingUpload.id, editedFile)
            setEditingUploadId(null)
          }}
          onCancel={() => setEditingUploadId(null)}
        />
      )}
    </>
  )
}
