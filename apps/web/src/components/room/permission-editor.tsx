import type { PowerLevels, RoomMemberInfo } from '@matrix-web/matrix-client'
import {
  getMatrixClient,
  getMyPowerLevel,
  getRoomMembers,
  getRoomPowerLevels,
  setUserPowerLevel,
  updatePowerLevels,
} from '@matrix-web/matrix-client'
import { Crown, Save, Shield, User } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

interface PermissionEditorProps {
  roomId: string
}

interface RoomActionLevel {
  key: keyof Pick<PowerLevels, 'eventsDefault' | 'stateDefault' | 'ban' | 'kick' | 'invite' | 'redact'>
  labelKey: string
}

const ROOM_ACTIONS: RoomActionLevel[] = [
  { key: 'eventsDefault', labelKey: 'permission.send_messages' },
  { key: 'invite', labelKey: 'permission.invite_users' },
  { key: 'kick', labelKey: 'permission.kick_users' },
  { key: 'ban', labelKey: 'permission.ban_users' },
  { key: 'redact', labelKey: 'permission.redact_messages' },
  { key: 'stateDefault', labelKey: 'permission.change_settings' },
]

const POWER_LEVEL_PRESETS = [
  { value: 0, labelKey: 'permission.level_default' },
  { value: 50, labelKey: 'permission.level_moderator' },
  { value: 100, labelKey: 'permission.level_admin' },
]

function roleIcon(level: number) {
  if (level >= 100)
    return <Crown className="h-4 w-4 text-amber-500" />
  if (level >= 50)
    return <Shield className="h-4 w-4 text-blue-500" />
  return <User className="h-4 w-4 text-muted-foreground" />
}

export function PermissionEditor({ roomId }: PermissionEditorProps) {
  const { t } = useTranslation()
  const [powerLevels, setPowerLevels] = useState<PowerLevels | null>(null)
  const [editedLevels, setEditedLevels] = useState<Partial<PowerLevels>>({})
  const [members, setMembers] = useState<RoomMemberInfo[]>([])
  const [userChanges, setUserChanges] = useState<Record<string, number>>({})
  const [myPower, setMyPower] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const client = getMatrixClient()
    if (!client)
      return

    const pl = getRoomPowerLevels(client, roomId)
    setPowerLevels(pl)
    setEditedLevels({})
    setUserChanges({})
    setMyPower(getMyPowerLevel(client, roomId))
    setMembers(getRoomMembers(client, roomId))
    setError(null)
    setSuccess(false)
  }, [roomId])

  const canEdit = myPower >= 100

  const handleActionLevelChange = useCallback((key: string, value: number) => {
    setEditedLevels(prev => ({ ...prev, [key]: value }))
    setSuccess(false)
  }, [])

  const handleUserPowerChange = useCallback((userId: string, level: number) => {
    setUserChanges(prev => ({ ...prev, [userId]: level }))
    setSuccess(false)
  }, [])

  const hasChanges = Object.keys(editedLevels).length > 0 || Object.keys(userChanges).length > 0

  const handleSave = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Save action level changes
      if (Object.keys(editedLevels).length > 0) {
        await updatePowerLevels(client, roomId, editedLevels)
      }

      // Save user power level changes
      for (const [userId, level] of Object.entries(userChanges)) {
        await setUserPowerLevel(client, roomId, userId, level)
      }

      // Refresh
      const pl = getRoomPowerLevels(client, roomId)
      setPowerLevels(pl)
      setEditedLevels({})
      setUserChanges({})
      setMembers(getRoomMembers(client, roomId))
      setSuccess(true)
    }
    catch {
      setError(t('permission.error_save'))
    }
    finally {
      setIsSaving(false)
    }
  }, [editedLevels, userChanges, roomId, t])

  if (!powerLevels)
    return null

  const currentActionValue = (key: keyof PowerLevels) => {
    if (key in editedLevels)
      return editedLevels[key as keyof typeof editedLevels] as number
    return powerLevels[key] as number
  }

  const currentUserPower = (userId: string) => {
    if (userId in userChanges)
      return userChanges[userId]!
    return powerLevels.users[userId] ?? powerLevels.usersDefault
  }

  return (
    <div className="space-y-6">
      {/* Room Action Levels */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('permission.action_levels')}</h3>
        <div className="space-y-3">
          {ROOM_ACTIONS.map(action => (
            <div key={action.key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground">{t(action.labelKey)}</label>
              <select
                value={currentActionValue(action.key)}
                onChange={e => handleActionLevelChange(action.key, Number(e.target.value))}
                disabled={!canEdit}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50"
              >
                {POWER_LEVEL_PRESETS.map(preset => (
                  <option key={preset.value} value={preset.value}>
                    {`${t(preset.labelKey)} (${preset.value})`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* User Power Levels */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('permission.user_levels')}</h3>
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {members.map(member => (
            <div key={member.userId} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50">
              {roleIcon(currentUserPower(member.userId))}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{member.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{member.userId}</p>
              </div>
              <select
                value={currentUserPower(member.userId)}
                onChange={e => handleUserPowerChange(member.userId, Number(e.target.value))}
                disabled={!canEdit || currentUserPower(member.userId) >= myPower}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground disabled:opacity-50"
              >
                <option value={0}>{`${t('member.role_member')} (0)`}</option>
                <option value={50}>{`${t('member.role_moderator')} (50)`}</option>
                <option value={100}>{`${t('member.role_admin')} (100)`}</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">{t('permission.saved')}</p>
      )}

      {/* Save button */}
      {canEdit && (
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="w-full gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? `${t('common.save')}...` : t('permission.save_permissions')}
        </Button>
      )}

      {!canEdit && (
        <p className="text-center text-sm text-muted-foreground">{t('permission.no_permission')}</p>
      )}
    </div>
  )
}
