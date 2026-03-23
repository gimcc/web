import { ChevronDown, Copy, CornerUpLeft, Flag, MessageSquare, Pencil, Pin, Plus, SmilePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addRecentEmoji } from '../hooks/use-recent-emojis'
import { QUICK_REACTIONS } from '../lib/emoji-data'
import { cn } from '../lib/utils'
import { EmojiPicker } from './emoji-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface MessageActionsProps {
  onReaction: (emoji: string) => void
  isSelf?: boolean
  isPinned?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onReply?: () => void
  onThread?: () => void
  onPin?: () => void
  onReport?: () => void
  onCopy?: () => void
}

/**
 * Chevron dropdown — sits inside the bubble (top-right area).
 * Clicking it opens a dropdown menu with message actions.
 */
export function MessageActionChevron({
  isSelf,
  isPinned,
  onEdit,
  onDelete,
  onReply,
  onThread,
  onPin,
  onReport,
  onCopy,
  onOpenChange,
}: Omit<MessageActionsProps, 'onReaction'> & { onOpenChange?: (open: boolean) => void }) {
  const { t } = useTranslation()

  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-sm p-0.5 transition-colors',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'text-muted-foreground hover:text-foreground',
          )}
          onClick={e => e.stopPropagation()}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isSelf ? 'end' : 'start'} side="bottom" className="min-w-[160px]">
        {onReply && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            onReply()
          }}
          >
            <CornerUpLeft className="h-4 w-4" />
            {t('message.reply')}
          </DropdownMenuItem>
        )}

        {onCopy && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          >
            <Copy className="h-4 w-4" />
            {t('message.copy')}
          </DropdownMenuItem>
        )}

        {isSelf && onEdit && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          >
            <Pencil className="h-4 w-4" />
            {t('message.edit')}
          </DropdownMenuItem>
        )}

        {onPin && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            onPin()
          }}
          >
            <Pin className={cn('h-4 w-4', isPinned && 'text-primary')} />
            {isPinned ? t('message.unpin') : t('message.pin')}
          </DropdownMenuItem>
        )}

        {onThread && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation()
            onThread()
          }}
          >
            <MessageSquare className="h-4 w-4" />
            {t('message.thread')}
          </DropdownMenuItem>
        )}

        {!isSelf && onReport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation()
                onReport()
              }}
            >
              <Flag className="h-4 w-4" />
              {t('report.title')}
            </DropdownMenuItem>
          </>
        )}

        {isSelf && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t('message.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Emoji quick-reaction button — sits outside the bubble.
 * Click opens a quick-reaction panel (6 emojis + "+" for full picker).
 */
export function MessageReactionButton({ onReaction, onOpenChange, align = 'end' }: { onReaction: (emoji: string) => void, onOpenChange?: (open: boolean) => void, align?: 'start' | 'end' }) {
  const { t } = useTranslation()
  const [showQuick, setShowQuick] = useState(false)
  const [showFullPicker, setShowFullPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClose = useCallback(() => {
    setShowQuick(false)
    setShowFullPicker(false)
    onOpenChange?.(false)
  }, [onOpenChange])

  useEffect(() => {
    if (!showQuick && !showFullPicker)
      return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showQuick, showFullPicker, handleClose])

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="flex items-center justify-center rounded-full bg-background/80 p-2 shadow-sm border border-border/50 transition-colors hover:bg-accent"
        onClick={(e) => {
          e.stopPropagation()
          if (showQuick || showFullPicker) {
            handleClose()
          }
          else {
            setShowQuick(true)
            onOpenChange?.(true)
          }
        }}
        aria-label={t('message.add_reaction')}
      >
        <SmilePlus className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Quick reaction panel */}
      {showQuick && !showFullPicker && (
        <div className={cn('absolute bottom-full z-50 mb-1.5', align === 'start' ? 'left-0' : 'right-0')}>
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-popover px-2 py-1.5 shadow-lg">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-transform hover:scale-125"
                onClick={(e) => {
                  e.stopPropagation()
                  addRecentEmoji(emoji)
                  onReaction(emoji)
                  handleClose()
                }}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                setShowQuick(false)
                setShowFullPicker(true)
              }}
              aria-label={t('message.add_reaction')}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Full emoji picker */}
      {showFullPicker && (
        <div className={cn('absolute bottom-full z-50 mb-1.5', align === 'start' ? 'left-0' : 'right-0')}>
          <EmojiPicker
            onSelect={(emoji) => {
              addRecentEmoji(emoji)
              onReaction(emoji)
              handleClose()
            }}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  )
}

// Keep backward-compatible export for other layouts (compact/modern)
export function MessageActions({ onReaction, isSelf, isPinned, onEdit, onDelete, onReply, onThread, onPin, onReport, onCopy }: MessageActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <MessageReactionButton onReaction={onReaction} />
      <MessageActionChevron
        isSelf={isSelf}
        isPinned={isPinned}
        onEdit={onEdit}
        onDelete={onDelete}
        onReply={onReply}
        onThread={onThread}
        onPin={onPin}
        onReport={onReport}
        onCopy={onCopy}
      />
    </div>
  )
}
