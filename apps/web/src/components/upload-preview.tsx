import { File as FileIcon, Pencil, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatFileSize } from '../lib/format'
import { ImageEditor } from './image-editor'

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

function UploadItem({ upload, onRemove, onCaptionChange, onEdit }: {
  upload: PendingUpload
  onRemove: () => void
  onCaptionChange: (caption: string) => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const isImage = upload.file.type.startsWith('image/')
  const isVideo = upload.file.type.startsWith('video/')

  const preview = useMemo(() => {
    if (isImage) {
      return (
        <img
          src={upload.previewUrl}
          alt={upload.file.name}
          className="h-16 w-16 rounded object-cover"
        />
      )
    }
    if (isVideo) {
      return (
        <video
          src={upload.previewUrl}
          className="h-16 w-16 rounded object-cover"
        >
          <track kind="captions" />
        </video>
      )
    }
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
        <FileIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }, [isImage, isVideo, upload.previewUrl, upload.file.name])

  return (
    <div className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
      <button
        type="button"
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
        onClick={onRemove}
        aria-label={t('common.remove')}
      >
        <X className="h-3 w-3" />
      </button>

      {isImage && onEdit && (
        <button
          type="button"
          className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"
          onClick={onEdit}
          aria-label={t('image_editor.title')}
          title={t('image_editor.title')}
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}

      {preview}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{upload.file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(upload.file.size)}</p>
        <input
          type="text"
          value={upload.caption}
          onChange={e => onCaptionChange(e.target.value)}
          placeholder={t('upload_preview.caption_placeholder')}
          className="mt-1 w-full rounded border border-input bg-transparent px-1.5 py-0.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  )
}

export function UploadPreview({ uploads, onRemove, onCaptionChange, onReplaceFile }: UploadPreviewProps) {
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null)

  if (uploads.length === 0 && !editingUploadId)
    return null

  const editingUpload = editingUploadId ? uploads.find(u => u.id === editingUploadId) : null

  return (
    <>
      {uploads.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2">
          {uploads.map(upload => (
            <UploadItem
              key={upload.id}
              upload={upload}
              onRemove={() => onRemove(upload.id)}
              onCaptionChange={caption => onCaptionChange(upload.id, caption)}
              onEdit={upload.file.type.startsWith('image/') && onReplaceFile
                ? () => setEditingUploadId(upload.id)
                : undefined}
            />
          ))}
        </div>
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
