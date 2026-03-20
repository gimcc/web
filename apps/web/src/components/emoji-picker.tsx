import { Clock, Search, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRecentEmojis } from '../hooks/use-recent-emojis'
import type { CustomEmoji, CustomEmojiPack } from './custom-emoji-types'
import {
  applySkintone,
  EMOJI_CATEGORIES,
  QUICK_REACTIONS,
  searchEmojis,
  SKIN_TONES,
  supportsSkintone,
} from '../lib/emoji-data'
import type { SkinToneId } from '../lib/emoji-data'
import { cn } from '../lib/utils'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  /** Custom emoji packs from Matrix room/user state */
  customPacks?: CustomEmojiPack[]
  /** Callback for selecting a custom emoji (shortcode + mxc URL) */
  onSelectCustom?: (emoji: CustomEmoji) => void
}

export function EmojiPicker({ onSelect, onClose, customPacks, onSelectCustom }: EmojiPickerProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('recent')
  const [skinTone, setSkinTone] = useState<SkinToneId>('default')
  const [showSkinTones, setShowSkinTones] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const recentEmojis = useRecentEmojis()

  const currentSkinToneEmoji = SKIN_TONES.find(s => s.id === skinTone)?.modifier || '✋'
  const skinToneDisplay = skinTone === 'default' ? '✋' : `✋${SKIN_TONES.find(s => s.id === skinTone)?.modifier ?? ''}`

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    return searchEmojis(searchQuery, 80)
  }, [searchQuery])

  const handleSelect = useCallback((emoji: string) => {
    const applied = supportsSkintone(emoji) ? applySkintone(emoji, skinTone) : emoji
    onSelect(applied)
    onClose()
  }, [onSelect, onClose, skinTone])

  const handleCustomSelect = useCallback((emoji: CustomEmoji) => {
    onSelectCustom?.(emoji)
    onClose()
  }, [onSelectCustom, onClose])

  const handleSkinToneSelect = useCallback((id: SkinToneId) => {
    setSkinTone(id)
    setShowSkinTones(false)
  }, [])

  // Build category list
  const categoryIds = useMemo(() => {
    const ids = ['recent', ...EMOJI_CATEGORIES.map(c => c.id)]
    if (customPacks && customPacks.length > 0) {
      for (const pack of customPacks) {
        ids.push(`custom:${pack.id}`)
      }
    }
    return ids
  }, [customPacks])

  const getCategoryIcon = useCallback((id: string) => {
    if (id === 'recent') return <Clock className="h-4 w-4" />
    const cat = EMOJI_CATEGORIES.find(c => c.id === id)
    if (cat) return <span className="text-sm">{cat.icon}</span>
    if (id.startsWith('custom:') && customPacks) {
      const pack = customPacks.find(p => `custom:${p.id}` === id)
      if (pack?.avatarUrl) {
        return <img src={pack.avatarUrl} alt={pack.name} className="h-4 w-4 rounded" />
      }
      return <span className="text-sm">📦</span>
    }
    return null
  }, [customPacks])

  return (
    <div
      className="w-80 rounded-lg border border-border bg-popover shadow-lg"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('emoji.search_placeholder')}
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Skin tone selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSkinTones(v => !v)}
            className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-accent"
            title={t('emoji.skin_tone')}
          >
            {skinToneDisplay}
          </button>
          {showSkinTones && (
            <div className="absolute right-0 top-full z-10 mt-1 flex gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md">
              {SKIN_TONES.map(tone => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => handleSkinToneSelect(tone.id)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-accent',
                    skinTone === tone.id && 'bg-accent',
                  )}
                  title={tone.label}
                >
                  {tone.id === 'default' ? '✋' : `✋${tone.modifier}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category tabs - only when not searching */}
      {!searchResults && (
        <div className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1 scrollbar-none">
          {categoryIds.map(id => (
            <button
              key={id}
              type="button"
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors',
                activeCategory === id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
              onClick={() => setActiveCategory(id)}
              title={id === 'recent' ? t('emoji.recent') : id.startsWith('custom:') ? customPacks?.find(p => `custom:${p.id}` === id)?.name : id}
            >
              {getCategoryIcon(id)}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="h-56 overflow-y-auto px-2 py-1">
        {searchResults ? (
          // Search results
          searchResults.length > 0 ? (
            <div className="grid grid-cols-8 gap-0.5">
              {searchResults.map(item => (
                <button
                  key={item.emoji}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
                  onClick={() => handleSelect(item.emoji)}
                  title={item.name}
                >
                  {supportsSkintone(item.emoji) ? applySkintone(item.emoji, skinTone) : item.emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('emoji.no_results')}</p>
            </div>
          )
        ) : activeCategory === 'recent' ? (
          // Recent emojis
          recentEmojis.length > 0 ? (
            <div className="grid grid-cols-8 gap-0.5">
              {recentEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('emoji.no_recent')}</p>
            </div>
          )
        ) : activeCategory.startsWith('custom:') ? (
          // Custom emoji pack
          (() => {
            const pack = customPacks?.find(p => `custom:${p.id}` === activeCategory)
            if (!pack || pack.emojis.length === 0) {
              return (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">{t('emoji.empty_pack')}</p>
                </div>
              )
            }
            return (
              <div className="grid grid-cols-8 gap-0.5">
                {pack.emojis.map(emoji => (
                  <button
                    key={emoji.shortcode}
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent"
                    onClick={() => handleCustomSelect(emoji)}
                    title={`:${emoji.shortcode}:`}
                  >
                    <img
                      src={emoji.url}
                      alt={emoji.shortcode}
                      className="h-6 w-6 object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )
          })()
        ) : (
          // Standard category
          (() => {
            const cat = EMOJI_CATEGORIES.find(c => c.id === activeCategory)
            if (!cat) return null
            return (
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map(item => (
                  <button
                    key={item.emoji}
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
                    onClick={() => handleSelect(item.emoji)}
                    title={item.name}
                  >
                    {supportsSkintone(item.emoji) ? applySkintone(item.emoji, skinTone) : item.emoji}
                  </button>
                ))}
              </div>
            )
          })()
        )}
      </div>

      {/* Quick reactions at bottom */}
      <div className="flex gap-1 border-t border-border px-3 py-2">
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
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
