import type { JoinRule } from '@matrix-web/matrix-client'
import {
  getMatrixClient,
  getMyPowerLevel,
  getRoomJoinRule,
  setRoomJoinRule,
} from '@matrix-web/matrix-client'
import { DoorOpen, Lock, UserRoundCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface JoinRulesEditorProps {
  roomId: string
}

const JOIN_RULES: { value: JoinRule, icon: typeof Lock, labelKey: string, descKey: string }[] = [
  { value: 'public', icon: DoorOpen, labelKey: 'join_rules.public', descKey: 'join_rules.public_desc' },
  { value: 'invite', icon: Lock, labelKey: 'join_rules.invite', descKey: 'join_rules.invite_desc' },
  { value: 'knock', icon: UserRoundCheck, labelKey: 'join_rules.knock', descKey: 'join_rules.knock_desc' },
]

export function JoinRulesEditor({ roomId }: JoinRulesEditorProps) {
  const { t } = useTranslation()
  const [currentRule, setCurrentRule] = useState<JoinRule>('invite')
  const [canEdit, setCanEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = getMatrixClient()
    if (!client)
      return
    setCurrentRule(getRoomJoinRule(client, roomId))
    setCanEdit(getMyPowerLevel(client, roomId) >= 50)
  }, [roomId])

  const handleChange = useCallback(async (rule: JoinRule) => {
    const client = getMatrixClient()
    if (!client)
      return

    const prev = currentRule
    setCurrentRule(rule)
    setError(null)

    try {
      await setRoomJoinRule(client, roomId, rule)
    }
    catch {
      setCurrentRule(prev)
      setError(t('join_rules.error_save'))
    }
  }, [roomId, currentRule, t])

  if (!canEdit) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">{t('join_rules.title')}</h4>
        <p className="text-xs text-muted-foreground">{t('join_rules.no_permission')}</p>
        <p className="text-sm text-foreground">
          {t(`join_rules.${currentRule === 'knock' ? 'knock' : currentRule === 'public' ? 'public' : 'invite'}`)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-foreground">{t('join_rules.title')}</h4>
        <p className="text-xs text-muted-foreground">{t('join_rules.description')}</p>
      </div>

      <div className="space-y-2">
        {JOIN_RULES.map(({ value, icon: Icon, labelKey, descKey }) => (
          <button
            key={value}
            type="button"
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              currentRule === value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-accent/50'
            }`}
            onClick={() => void handleChange(value)}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${currentRule === value ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
              <p className="text-xs text-muted-foreground">{t(descKey)}</p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
