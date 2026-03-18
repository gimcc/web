import { CornerUpLeft, Pencil, SmilePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmojiPicker, QUICK_REACTIONS } from './emoji-picker'

interface MessageActionsProps {
  onReaction: (emoji: string) => void
  isSelf?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onReply?: () => void
}

export function MessageActions({ onReaction, isSelf, onEdit, onDelete, onReply }: MessageActionsProps) {
  const { t } = useTranslation()
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClose = useCallback(() => setShowPicker(false), [])

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker)
      return

    function handleClickOutside(e: MouseEvent) {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node)
        && buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  return (
    <div className="relative">
      {/* Quick reaction buttons */}
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-popover px-1 shadow-sm">
        {QUICK_REACTIONS.slice(0, 3).map(emoji => (
          <button
            key={emoji}
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation()
              onReaction(emoji)
            }}
          >
            {emoji}
          </button>
        ))}

        <div className="mx-0.5 h-4 w-px bg-border" />

        <button
          ref={buttonRef}
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            setShowPicker(v => !v)
          }}
          aria-label={t('message.add_reaction')}
        >
          <SmilePlus className="h-4 w-4" />
        </button>

        {onReply && (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onReply()
            }}
            aria-label={t('message.reply')}
          >
            <CornerUpLeft className="h-4 w-4" />
          </button>
        )}

        {isSelf && onEdit && (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            aria-label={t('message.edit')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {isSelf && onDelete && (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label={t('message.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Emoji picker popover */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute right-0 top-full z-50 mt-1"
        >
          <EmojiPicker onSelect={onReaction} onClose={handleClose} />
        </div>
      )}
    </div>
  )
}
