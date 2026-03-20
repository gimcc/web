import { PackageOpen, Search, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import type { CustomEmojiPack } from './custom-emoji-types'

interface StickerPickerProps {
  packs: CustomEmojiPack[]
  onSelect: (sticker: { shortcode: string, url: string, body?: string }) => void
  onClose: () => void
}

export function StickerPicker({ packs, onSelect, onClose }: StickerPickerProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activePackIndex, setActivePackIndex] = useState(0)

  const filteredPacks = useMemo(() => {
    setActivePackIndex(0)
    if (!searchQuery.trim()) return packs
    const q = searchQuery.toLowerCase()
    return packs
      .map(pack => ({
        ...pack,
        emojis: pack.emojis.filter(e =>
          e.shortcode.toLowerCase().includes(q)
          || e.body?.toLowerCase().includes(q),
        ),
      }))
      .filter(pack => pack.emojis.length > 0)
  }, [packs, searchQuery])

  const activePack = filteredPacks[activePackIndex] ?? filteredPacks[0]

  const handleSelect = useCallback((sticker: { shortcode: string, url: string, body?: string }) => {
    onSelect(sticker)
    onClose()
  }, [onSelect, onClose])

  if (packs.length === 0) {
    return (
      <div
        className="w-80 rounded-lg border border-border bg-popover p-6 shadow-lg"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <PackageOpen className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('sticker.no_packs')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('sticker.no_packs_hint')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-80 rounded-lg border border-border bg-popover shadow-lg"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('sticker.search_placeholder')}
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
      </div>

      {/* Pack tabs */}
      {filteredPacks.length > 1 && (
        <div className="flex gap-0.5 overflow-x-auto border-b border-border px-2 py-1 scrollbar-none">
          {filteredPacks.map((pack, i) => (
            <button
              key={pack.id}
              type="button"
              className={cn(
                'flex h-7 shrink-0 items-center gap-1 rounded px-2 text-xs transition-colors',
                activePackIndex === i
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
              onClick={() => setActivePackIndex(i)}
            >
              {pack.avatarUrl && <img src={pack.avatarUrl} alt="" className="h-4 w-4 rounded" />}
              <span className="max-w-20 truncate">{pack.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sticker grid */}
      <div className="h-64 overflow-y-auto p-2">
        {activePack && activePack.emojis.length > 0 ? (
          <div className="grid grid-cols-4 gap-1">
            {activePack.emojis.map(sticker => (
              <button
                key={sticker.shortcode}
                type="button"
                className="flex aspect-square items-center justify-center rounded-lg p-1 transition-colors hover:bg-accent"
                onClick={() => handleSelect(sticker)}
                title={`:${sticker.shortcode}:`}
              >
                <img
                  src={sticker.url}
                  alt={sticker.shortcode}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('sticker.no_stickers')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
