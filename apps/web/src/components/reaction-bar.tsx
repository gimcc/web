import type { Reaction } from '@matrix-web/matrix-client'
import { useAuthStore } from '@matrix-web/matrix-client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

interface ReactionBarProps {
  reactions: Reaction[]
  onToggle: (emoji: string) => void
}

function ReactionDetailPanel({ reactions, onToggle }: { reactions: Reaction[], onToggle: (emoji: string) => void }) {
  const { t } = useTranslation()
  const userId = useAuthStore(s => s.session?.userId)
  const [activeTab, setActiveTab] = useState<string>('all')

  const totalCount = reactions.reduce((sum, r) => sum + r.senderIds.length, 0)

  // Build the list for the active tab
  const entries: { senderId: string, emoji: string }[] = []
  if (activeTab === 'all') {
    for (const reaction of reactions) {
      for (const senderId of reaction.senderIds) {
        entries.push({ senderId, emoji: reaction.emoji })
      }
    }
  }
  else {
    const reaction = reactions.find(r => r.emoji === activeTab)
    if (reaction) {
      for (const senderId of reaction.senderIds) {
        entries.push({ senderId, emoji: reaction.emoji })
      }
    }
  }

  return (
    <div className="space-y-2">
      {/* Tabs: All + each emoji */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0">
        <button
          type="button"
          className={cn(
            'shrink-0 px-2 py-1.5 text-xs font-medium transition-colors border-b-2',
            activeTab === 'all'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab('all')}
        >
          {t('reaction.all', 'All')}
          {' '}
          {totalCount}
        </button>
        {reactions.map(reaction => (
          <button
            key={reaction.emoji}
            type="button"
            className={cn(
              'shrink-0 flex items-center gap-0.5 px-2 py-1.5 text-xs transition-colors border-b-2',
              activeTab === reaction.emoji
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(reaction.emoji)}
          >
            <span className="text-sm">{reaction.emoji}</span>
            <span>{reaction.senderIds.length}</span>
          </button>
        ))}
      </div>

      {/* User list */}
      <ul className="max-h-48 space-y-0.5 overflow-y-auto">
        {entries.map(({ senderId, emoji }) => {
          const isSelfReaction = senderId === userId
          return (
            <li key={`${senderId}-${emoji}`}>
              <button
                type="button"
                disabled={!isSelfReaction}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  isSelfReaction
                    ? 'cursor-pointer hover:bg-destructive/10 transition-colors'
                    : 'cursor-default',
                )}
                onClick={() => {
                  if (isSelfReaction) {
                    onToggle(emoji)
                  }
                }}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {senderId.charAt(1).toUpperCase()}
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="truncate text-foreground">
                    {isSelfReaction ? t('reaction.you', 'You') : senderId}
                  </span>
                  {isSelfReaction && (
                    <span className="text-[10px] text-muted-foreground">{t('reaction.click_to_remove', 'Click to remove')}</span>
                  )}
                </div>
                <span className="shrink-0 text-lg">{emoji}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const userId = useAuthStore(s => s.session?.userId)
  const [open, setOpen] = useState(false)

  const activeReactions = reactions.filter(r => r.senderIds.length > 0)

  if (activeReactions.length === 0)
    return null

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap gap-1">
          {activeReactions.map(reaction => (
            <PopoverTrigger key={reaction.emoji} asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                  reaction.senderIds.includes(userId ?? '')
                    ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(true)
                }}
              >
                <span className="text-sm">{reaction.emoji}</span>
                <span>{reaction.senderIds.length}</span>
              </button>
            </PopoverTrigger>
          ))}
        </div>
        <PopoverContent className="w-64 p-3" side="top" align="start">
          <ReactionDetailPanel reactions={activeReactions} onToggle={(emoji) => {
            onToggle(emoji)
            setOpen(false)
          }} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
