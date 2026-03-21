import type { UserDeviceInfo, VerificationRequest } from '@matrix-web/matrix-client'
import {
  getMatrixClient,
  getRoomMembers,
  getUserDevicesWithTrust,
  requestDeviceVerification,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { DeviceVerificationDialog } from './device-verification-dialog'

interface UnverifiedDeviceWarningProps {
  roomId: string
  className?: string
}

interface UnverifiedUser {
  userId: string
  displayName: string
  devices: UserDeviceInfo[]
}

export function UnverifiedDeviceWarning({ roomId, className }: UnverifiedDeviceWarningProps) {
  const { t } = useTranslation()
  const session = useAuthStore(s => s.session)
  const [unverifiedUsers, setUnverifiedUsers] = useState<UnverifiedUser[]>([])
  const [expanded, setExpanded] = useState(false)
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null)
  const [verifyingDeviceId, setVerifyingDeviceId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const client = getMatrixClient()
    if (!client) return

    async function load() {
      const members = getRoomMembers(client!, roomId)
      const results: UnverifiedUser[] = []

      for (const member of members) {
        try {
          const devices = await getUserDevicesWithTrust(client!, member.userId)
          const unverified = devices.filter(d => !d.trust?.verified)
          if (unverified.length > 0) {
            results.push({
              userId: member.userId,
              displayName: member.displayName,
              devices: unverified,
            })
          }
        } catch {
          // Skip users where crypto info is unavailable
        }
      }

      if (!cancelled) setUnverifiedUsers(results)
    }

    load()
    return () => { cancelled = true }
  }, [roomId])

  const handleVerify = useCallback(async (userId: string, deviceId: string) => {
    const client = getMatrixClient()
    if (!client) return

    setVerifyingDeviceId(deviceId)
    try {
      const request = await requestDeviceVerification(client, userId, deviceId)
      setVerificationRequest(request)
    } catch {
      // Verification start failed
    } finally {
      setVerifyingDeviceId(null)
    }
  }, [])

  const handleVerificationClose = useCallback(() => {
    setVerificationRequest(null)
  }, [])

  if (unverifiedUsers.length === 0) return null

  const totalUnverified = unverifiedUsers.reduce((sum, u) => sum + u.devices.length, 0)

  return (
    <>
      <div
        className={cn(
          'rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2',
          className,
        )}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2"
          onClick={() => setExpanded(v => !v)}
        >
          <ShieldAlert className="size-4 shrink-0 text-yellow-500" />
          <p className="flex-1 text-left text-xs text-yellow-700 dark:text-yellow-400">
            {t('trust.unverified_warning', { count: totalUnverified })}
          </p>
          {expanded
            ? <ChevronUp className="size-3.5 shrink-0 text-yellow-500" />
            : <ChevronDown className="size-3.5 shrink-0 text-yellow-500" />}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {unverifiedUsers.map(user => (
              <div key={user.userId} className="space-y-1">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  {user.displayName}
                </p>
                {user.devices.map(device => (
                  <div key={device.deviceId} className="flex items-center justify-between gap-2 pl-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-yellow-700/80 dark:text-yellow-400/80">
                        {device.displayName ?? device.deviceId}
                      </p>
                      <p className="truncate text-[10px] text-yellow-700/60 dark:text-yellow-400/60">
                        {device.deviceId}
                      </p>
                    </div>
                    {session?.userId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 border-yellow-500/30 px-2 text-[10px] text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-400"
                        disabled={verifyingDeviceId === device.deviceId}
                        onClick={() => handleVerify(user.userId, device.deviceId)}
                      >
                        {verifyingDeviceId === device.deviceId
                          ? t('device_verification.verifying')
                          : t('device_verification.verify_button')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {verificationRequest && (
        <DeviceVerificationDialog
          request={verificationRequest}
          onClose={handleVerificationClose}
        />
      )}
    </>
  )
}
