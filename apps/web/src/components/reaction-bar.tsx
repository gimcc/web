import type { Reaction } from '@matrix-web/matrix-client'
import { useAuthStore } from '@matrix-web/matrix-client'
import { cn } from '../lib/utils'

interface ReactionBarProps {
  reactions: Reaction[]
  onToggle: (emoji: string) => void
}

export function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const userId = useAuthStore(s => s.session?.userId)

  if (reactions.length === 0)
    return null

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map(reaction => (
        <button
          key={reaction.emoji}
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
            reaction.senderIds.includes(userId ?? '')
              ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
          )}
          onClick={() => onToggle(reaction.emoji)}
          title={reaction.senderIds.join(', ')}
        >
          <span className="text-sm">{reaction.emoji}</span>
          <span>{reaction.senderIds.length}</span>
        </button>
      ))}
    </div>
  )
}
