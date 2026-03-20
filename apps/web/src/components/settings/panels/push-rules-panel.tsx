import type { PushRule } from '@matrix-web/matrix-client'
import {
  addKeywordRule,
  getMatrixClient,
  getPushRules,
  removeKeywordRule,
  togglePushRule,
} from '@matrix-web/matrix-client'
import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Switch } from '../../ui/switch'

function RuleRow({
  rule,
  onToggle,
}: {
  rule: PushRule
  onToggle: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{rule.ruleId}</p>
        {rule.pattern && (
          <p className="truncate text-xs text-muted-foreground">
            Pattern:
            {' '}
            {rule.pattern}
          </p>
        )}
      </div>
      <Switch
        checked={rule.enabled}
        onCheckedChange={onToggle}
      />
    </div>
  )
}

export function PushRulesPanel() {
  const { t } = useTranslation()
  const [globalRules, setGlobalRules] = useState<PushRule[]>([])
  const [keywordRules, setKeywordRules] = useState<PushRule[]>([])
  const [specialRules, setSpecialRules] = useState<PushRule[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRules = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return

    try {
      const rules = await getPushRules(client)
      setGlobalRules(rules.global)
      setKeywordRules(rules.keyword)
      setSpecialRules(rules.special)
    }
    catch { /* ignore */ }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  const handleToggle = useCallback(async (rule: PushRule, enabled: boolean) => {
    const client = getMatrixClient()
    if (!client)
      return

    setError(null)
    try {
      await togglePushRule(client, rule.kind, rule.ruleId, enabled)
      await loadRules()
    }
    catch {
      setError(t('push_rules.error_toggle'))
    }
  }, [loadRules, t])

  const handleAddKeyword = useCallback(async () => {
    const keyword = newKeyword.trim()
    if (!keyword)
      return

    const client = getMatrixClient()
    if (!client)
      return

    setError(null)
    try {
      await addKeywordRule(client, keyword)
      setNewKeyword('')
      await loadRules()
    }
    catch {
      setError(t('push_rules.error_add'))
    }
  }, [newKeyword, loadRules, t])

  const handleRemoveKeyword = useCallback(async (ruleId: string) => {
    const client = getMatrixClient()
    if (!client)
      return

    setError(null)
    try {
      await removeKeywordRule(client, ruleId)
      await loadRules()
    }
    catch {
      setError(t('push_rules.error_remove'))
    }
  }, [loadRules, t])

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t('app.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-foreground">{t('push_rules.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('push_rules.description')}</p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Keyword rules with add */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">{t('push_rules.keyword')}</h4>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            placeholder={t('push_rules.keyword_placeholder')}
            onKeyDown={e => e.key === 'Enter' && void handleAddKeyword()}
          />
          <Button size="sm" onClick={() => void handleAddKeyword()} disabled={!newKeyword.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {keywordRules.length === 0
          ? (
              <p className="text-xs text-muted-foreground">{t('push_rules.no_rules')}</p>
            )
          : (
              <div className="space-y-1.5">
                {keywordRules.map(rule => (
                  <div key={rule.ruleId} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <RuleRow rule={rule} onToggle={enabled => void handleToggle(rule, enabled)} />
                    </div>
                    {!rule.default && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveKeyword(rule.ruleId)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
      </div>

      {/* Special rules */}
      {specialRules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">{t('push_rules.special')}</h4>
          <div className="space-y-1.5">
            {specialRules.map(rule => (
              <RuleRow key={rule.ruleId} rule={rule} onToggle={enabled => void handleToggle(rule, enabled)} />
            ))}
          </div>
        </div>
      )}

      {/* Global rules */}
      {globalRules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">{t('push_rules.global')}</h4>
          <div className="space-y-1.5">
            {globalRules.map(rule => (
              <RuleRow key={rule.ruleId} rule={rule} onToggle={enabled => void handleToggle(rule, enabled)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
