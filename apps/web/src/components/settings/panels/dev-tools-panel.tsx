import type { AccountDataEntry } from '@matrix-web/matrix-client'
import {
  getAccountData,
  getMatrixClient,
  getRoomAccountData,
  setAccountData,
  setRoomAccountData,
} from '@matrix-web/matrix-client'
import { ChevronDown, ChevronRight, Pencil, Save, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'

function AccountDataRow({
  entry,
  onSave,
}: {
  entry: AccountDataEntry
  onSave: (type: string, content: Record<string, unknown>) => Promise<void>
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleEdit = useCallback(() => {
    setJsonText(JSON.stringify(entry.content, null, 2))
    setEditing(true)
    setExpanded(true)
    setError(null)
  }, [entry.content])

  const handleSave = useCallback(async () => {
    try {
      const parsed: unknown = JSON.parse(jsonText)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError(t('dev_tools.error_parse'))
        return
      }
      await onSave(entry.type, parsed as Record<string, unknown>)
      setEditing(false)
      setError(null)
    }
    catch (e) {
      if (e instanceof SyntaxError)
        setError(t('dev_tools.error_parse'))
      else
        setError(t('dev_tools.error_save'))
    }
  }, [jsonText, entry.type, onSave, t])

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/50"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="truncate font-mono text-xs text-foreground">{entry.type}</span>
        <button
          type="button"
          className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            handleEdit()
          }}
        >
          <Pencil className="h-3 w-3" />
        </button>
      </button>

      {expanded && (
        <div className="border-t border-border px-3 py-2">
          {editing
            ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-md border border-border bg-muted/30 p-2 font-mono text-xs text-foreground"
                    rows={8}
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleSave()} className="gap-1">
                      <Save className="h-3 w-3" />
                      {t('dev_tools.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="gap-1">
                      <X className="h-3 w-3" />
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )
            : (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                  {JSON.stringify(entry.content, null, 2)}
                </pre>
              )}
        </div>
      )}
    </div>
  )
}

const DEV_MODE_KEY = 'matrix-web-dev-mode'

export function useDevMode() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(DEV_MODE_KEY) === 'true'
    }
    catch {
      return false
    }
  })

  const toggle = useCallback((value: boolean) => {
    setEnabled(value)
    try {
      if (value)
        localStorage.setItem(DEV_MODE_KEY, 'true')
      else
        localStorage.removeItem(DEV_MODE_KEY)
    }
    catch {
      // localStorage unavailable
    }
  }, [])

  return { enabled, toggle }
}

export function DevToolsPanel() {
  const { t } = useTranslation()
  const { enabled: devMode, toggle: toggleDevMode } = useDevMode()
  const [globalData, setGlobalData] = useState<AccountDataEntry[]>([])
  const [roomData, setRoomData] = useState<AccountDataEntry[]>([])
  const [roomId, setRoomId] = useState('')

  const loadGlobalData = useCallback(() => {
    const client = getMatrixClient()
    if (!client)
      return
    setGlobalData(getAccountData(client))
  }, [])

  useEffect(() => {
    loadGlobalData()
  }, [loadGlobalData])

  const loadRoomData = useCallback(() => {
    if (!roomId.trim())
      return
    const client = getMatrixClient()
    if (!client)
      return
    setRoomData(getRoomAccountData(client, roomId.trim()))
  }, [roomId])

  useEffect(() => {
    loadRoomData()
  }, [loadRoomData])

  const handleSaveGlobal = useCallback(async (type: string, content: Record<string, unknown>) => {
    const client = getMatrixClient()
    if (!client)
      throw new Error('Client not ready')
    await setAccountData(client, type, content)
    loadGlobalData()
  }, [loadGlobalData])

  const handleSaveRoom = useCallback(async (type: string, content: Record<string, unknown>) => {
    if (!roomId.trim())
      return
    const client = getMatrixClient()
    if (!client)
      throw new Error('Client not ready')
    await setRoomAccountData(client, roomId.trim(), type, content)
    loadRoomData()
  }, [roomId, loadRoomData])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-foreground">{t('dev_tools.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('dev_tools.description')}</p>
      </div>

      {/* Developer mode toggle */}
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{t('dev_tools.enable_dev_mode')}</span>
        <input
          type="checkbox"
          checked={devMode}
          onChange={e => toggleDevMode(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
      </label>

      {!devMode && (
        <p className="text-xs text-muted-foreground">{t('dev_tools.dev_mode_hint')}</p>
      )}

      {devMode && (
        <>
      {/* Global account data */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">{t('dev_tools.global_data')}</h4>
        {globalData.length === 0
          ? (
              <p className="text-xs text-muted-foreground">{t('dev_tools.no_data')}</p>
            )
          : (
              <div className="space-y-1.5">
                {globalData.map(entry => (
                  <AccountDataRow key={entry.type} entry={entry} onSave={handleSaveGlobal} />
                ))}
              </div>
            )}
      </div>

      {/* Room account data */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">{t('dev_tools.room_data')}</h4>
        <Input
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          placeholder={t('dev_tools.room_id_placeholder')}
          className="font-mono text-xs"
        />
        {roomId.trim() && roomData.length === 0 && (
          <p className="text-xs text-muted-foreground">{t('dev_tools.no_data')}</p>
        )}
        {roomData.length > 0 && (
          <div className="space-y-1.5">
            {roomData.map(entry => (
              <AccountDataRow key={entry.type} entry={entry} onSave={handleSaveRoom} />
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
