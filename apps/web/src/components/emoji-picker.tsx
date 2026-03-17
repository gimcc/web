import { useCallback, useState } from 'react'
import { cn } from '../lib/utils'

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😂', '🥹', '😊', '😍', '🥰', '😘', '🤔', '😮', '😢', '😭', '🤣', '😎', '🤩', '🙄', '😴'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '👋', '🫡'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❤️‍🔥', '💯'],
  },
  {
    name: 'Objects',
    emojis: ['🔥', '⭐', '🎉', '🎊', '✅', '❌', '⚡', '💡', '🚀', '👀', '🙈', '💀'],
  },
]

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0)

  const handleSelect = useCallback((emoji: string) => {
    onSelect(emoji)
    onClose()
  }, [onSelect, onClose])

  return (
    <div
      className="w-72 rounded-lg border border-border bg-popover shadow-lg"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Quick reactions */}
      <div className="flex gap-1 border-b border-border p-2">
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
            onClick={() => handleSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-border px-2 pt-1">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            type="button"
            className={cn(
              'rounded-t px-2 py-1 text-xs transition-colors',
              activeCategory === i
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveCategory(i)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid max-h-40 grid-cols-8 gap-0.5 overflow-y-auto p-2">
        {EMOJI_CATEGORIES[activeCategory]!.emojis.map(emoji => (
          <button
            key={emoji}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
            onClick={() => handleSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

export { QUICK_REACTIONS }
