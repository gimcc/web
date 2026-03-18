import type { SearchResult } from '@matrix-web/matrix-client'
import { getMatrixClient, searchMessages } from '@matrix-web/matrix-client'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../ui/input'

const RE_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g

interface MessageSearchProps {
  roomId: string
  onClose: () => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageSearch({ roomId, onClose }: MessageSearchProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const client = getMatrixClient()
    if (!client)
      return

    let cancelled = false
    setIsSearching(true)
    const timer = setTimeout(() => {
      searchMessages(client, roomId, query)
        .then((r) => {
          if (!cancelled)
            setResults(r)
        })
        .finally(() => {
          if (!cancelled)
            setIsSearching(false)
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, roomId])

  const highlight = useCallback((text: string) => {
    if (!query.trim())
      return text
    const regex = new RegExp(`(${query.replace(RE_SPECIAL_CHARS, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-primary/20 text-foreground">{part}</mark>
        : part,
    )
  }, [query])

  return (
    <div className="flex h-full w-72 flex-col border-l border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('ux.search_placeholder')}
          className="h-8 text-xs"
          autoFocus
        />
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isSearching && <p className="px-3 py-8 text-center text-xs text-muted-foreground">{t('ux.searching')}</p>}
        {!isSearching && results.length === 0 && query.trim() && (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">{t('ux.no_results')}</p>
        )}
        {results.map(result => (
          <div key={result.eventId} className="border-b border-border px-3 py-2 hover:bg-accent/50">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-foreground">{result.senderName}</span>
              <span className="text-[10px] text-muted-foreground">{formatTime(result.timestamp)}</span>
            </div>
            <p className="text-sm text-foreground">{highlight(result.body)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
