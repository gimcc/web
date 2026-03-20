import {
  addRoomAlias,
  getMatrixClient,
  getRoomAliases,
  removeRoomAlias,
  setCanonicalAlias,
} from '@matrix-web/matrix-client'
import { Crown, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface AliasEditorProps {
  roomId: string
  canEdit: boolean
}

const ALIAS_REGEX = /^#[\w.-]+:\S+$/

export function AliasEditor({ roomId, canEdit }: AliasEditorProps) {
  const { t } = useTranslation()

  const [canonical, setCanonical] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [newAlias, setNewAlias] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAliases = useCallback(() => {
    const client = getMatrixClient()
    if (!client)
      return
    const result = getRoomAliases(client, roomId)
    setCanonical(result.canonical)
    setAlternatives(result.alternatives)
  }, [roomId])

  useEffect(() => {
    loadAliases()
  }, [loadAliases])

  const handleAddAlias = useCallback(async () => {
    if (!newAlias.trim())
      return

    if (!ALIAS_REGEX.test(newAlias.trim())) {
      setError(t('room.alias_error_format'))
      return
    }

    const client = getMatrixClient()
    if (!client)
      return

    setIsAdding(true)
    setError(null)

    try {
      await addRoomAlias(client, newAlias.trim(), roomId)

      // If no canonical alias, set this as canonical
      if (!canonical) {
        await setCanonicalAlias(client, roomId, newAlias.trim())
      }
      else {
        // Add to alt_aliases
        await setCanonicalAlias(client, roomId, canonical, [...alternatives, newAlias.trim()])
      }

      setNewAlias('')
      loadAliases()
    }
    catch {
      setError(t('room.alias_error_add'))
    }
    finally {
      setIsAdding(false)
    }
  }, [newAlias, roomId, canonical, alternatives, loadAliases, t])

  const handleRemoveAlias = useCallback(async (alias: string) => {
    const client = getMatrixClient()
    if (!client)
      return

    setError(null)

    try {
      await removeRoomAlias(client, alias)

      // Update canonical alias state
      if (alias === canonical) {
        const newCanonical = alternatives[0] ?? null
        const newAlts = alternatives.slice(1)
        await setCanonicalAlias(client, roomId, newCanonical, newAlts)
      }
      else {
        const newAlts = alternatives.filter(a => a !== alias)
        await setCanonicalAlias(client, roomId, canonical, newAlts)
      }

      loadAliases()
    }
    catch {
      setError(t('room.alias_error_remove'))
    }
  }, [canonical, alternatives, roomId, loadAliases, t])

  const handleSetCanonical = useCallback(async (alias: string) => {
    const client = getMatrixClient()
    if (!client)
      return

    setError(null)

    try {
      const allAliases = [canonical, ...alternatives].filter((a): a is string => a != null && a !== alias)
      await setCanonicalAlias(client, roomId, alias, allAliases)
      loadAliases()
    }
    catch {
      setError(t('room.alias_error_canonical'))
    }
  }, [canonical, alternatives, roomId, loadAliases, t])

  const allAliases = [
    ...(canonical ? [{ alias: canonical, isCanonical: true }] : []),
    ...alternatives.map(a => ({ alias: a, isCanonical: false })),
  ]

  return (
    <div className="space-y-4">
      {/* Current aliases */}
      {allAliases.length === 0
        ? (
            <p className="text-sm text-muted-foreground">{t('room.alias_none')}</p>
          )
        : (
            <div className="space-y-1">
              {allAliases.map(({ alias, isCanonical: isCurrent }) => (
                <div
                  key={alias}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                    {alias}
                  </span>

                  {isCurrent && (
                    <span className="flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      <Crown className="h-3 w-3" />
                      {t('room.alias_canonical')}
                    </span>
                  )}

                  {canEdit && !isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleSetCanonical(alias)}
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={t('room.alias_set_canonical')}
                    >
                      {t('room.alias_set_canonical')}
                    </button>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(alias)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title={t('room.alias_remove')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

      {/* Add new alias */}
      {canEdit && (
        <div className="space-y-2">
          <Label className="text-sm">{t('room.alias_add')}</Label>
          <div className="flex gap-2">
            <Input
              value={newAlias}
              onChange={e => setNewAlias(e.target.value)}
              placeholder={t('room.alias_add_placeholder')}
              className="font-mono text-sm"
              onKeyDown={e => e.key === 'Enter' && handleAddAlias()}
            />
            <Button
              size="sm"
              onClick={handleAddAlias}
              disabled={isAdding || !newAlias.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
