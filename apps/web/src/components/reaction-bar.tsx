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

function ReactionDetail({ reaction }: { reaction: Reaction }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 border-b border-border pb-1.5">
        <span className="text-lg">{reaction.emoji}</span>
        <span className="text-xs text-muted-foreground">
          {t('message.reaction_count', { count: reaction.senderIds.length })}
        </span>
      </div>
      <ul className="max-h-40 space-y-1 overflow-y-auto">
        {reaction.senderIds.map(senderId => (
          <li key={senderId} className="flex items-center gap-2 text-sm">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
              {senderId.charAt(1).toUpperCase()}
            </div>
            <span className="truncate text-foreground">{senderId}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const userId = useAuthStore(s => s.session?.userId)
  const [openEmoji, setOpenEmoji] = useState<string | null>(null)

  if (reactions.length === 0)
    return null

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map(reaction => (
        <Popover
          key={reaction.emoji}
          open={openEmoji === reaction.emoji}
          onOpenChange={open => setOpenEmoji(open ? reaction.emoji : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                reaction.senderIds.includes(userId ?? '')
                  ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                  : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
              )}
              onClick={(e) => {
                // Right-click or long-press opens popover; normal click toggles reaction
                if (openEmoji === reaction.emoji) {
                  setOpenEmoji(null)
                }
                else {
                  e.preventDefault()
                  onToggle(reaction.emoji)
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setOpenEmoji(openEmoji === reaction.emoji ? null : reaction.emoji)
              }}
              title={reaction.senderIds.join(', ')}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span>{reaction.senderIds.length}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" side="top" align="start">
            <ReactionDetail reaction={reaction} />
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}
