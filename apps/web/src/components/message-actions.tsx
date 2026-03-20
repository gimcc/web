import { CornerUpLeft, Flag, MessageSquare, Pencil, Pin, SmilePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addRecentEmoji } from '../hooks/use-recent-emojis'
import { QUICK_REACTIONS } from '../lib/emoji-data'
import { EmojiPicker } from './emoji-picker'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

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
}

export function MessageActions({ onReaction, isSelf, isPinned, onEdit, onDelete, onReply, onThread, onPin, onReport }: MessageActionsProps) {
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
          <Button
            key={emoji}
            variant="ghost"
            size="icon-xs"
            className="text-sm"
            onClick={(e) => {
              e.stopPropagation()
              onReaction(emoji)
            }}
          >
            {emoji}
          </Button>
        ))}

        <Separator orientation="vertical" className="mx-0.5 h-4" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={buttonRef}
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation()
                setShowPicker(v => !v)
              }}
              aria-label={t('message.add_reaction')}
            >
              <SmilePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('message.add_reaction')}</TooltipContent>
        </Tooltip>

        {onReply && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onReply()
                }}
                aria-label={t('message.reply')}
              >
                <CornerUpLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('message.reply')}</TooltipContent>
          </Tooltip>
        )}

        {isSelf && onEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                aria-label={t('message.edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('message.edit')}</TooltipContent>
          </Tooltip>
        )}

        {isSelf && onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                aria-label={t('message.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('message.delete')}</TooltipContent>
          </Tooltip>
        )}

        {onPin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onPin()
                }}
                aria-label={isPinned ? t('message.unpin') : t('message.pin')}
              >
                <Pin className={`h-3.5 w-3.5 ${isPinned ? 'text-primary' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPinned ? t('message.unpin') : t('message.pin')}</TooltipContent>
          </Tooltip>
        )}

        {!isSelf && onReport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onReport()
                }}
                aria-label={t('report.title')}
              >
                <Flag className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('report.title')}</TooltipContent>
          </Tooltip>
        )}

        {onThread && (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onThread()
                  }}
                  aria-label={t('message.thread')}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('message.thread')}</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* Emoji picker popover */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute right-0 top-full z-50 mt-1"
        >
          <EmojiPicker
            onSelect={(emoji) => {
              addRecentEmoji(emoji)
              onReaction(emoji)
            }}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  )
}
