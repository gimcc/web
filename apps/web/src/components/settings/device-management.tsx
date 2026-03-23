import type { DeviceInfo, DeviceTrustInfo, VerificationRequest } from '@matrix-web/matrix-client'
import {
  deleteDevice,
  getDevices,
  getDeviceTrust,
  getMatrixClient,
  renameDevice,
  requestDeviceVerification,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { CheckCircle, Monitor, Pencil, ShieldCheck, ShieldX, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceVerificationDialog } from '../crypto/device-verification-dialog'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'

function formatLastSeen(ts: number | null, t: (key: string) => string): string {
  if (!ts)
    return t('devices.never')
  const date = new Date(ts)
  return date.toLocaleString()
}

export function DeviceManagement() {
  const { t } = useTranslation()
  const session = useAuthStore(s => s.session)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [uiaPassword, setUiaPassword] = useState('')
  const [uiaSession, setUiaSession] = useState<string | null>(null)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null)
  const [trustStatus, setTrustStatus] = useState<Map<string, DeviceTrustInfo>>(() => new Map())

  const setSuccessWithAutoClear = (msg: string) => {
    setSuccess(msg)
    setTimeout(setSuccess, 3000, null)
  }

  const loadDevices = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return
    try {
      const devs = await getDevices(client)
      setDevices(devs)

      // Load verification status for all devices
      const userId = session?.userId
      if (userId) {
        const trustMap = new Map<string, DeviceTrustInfo>()
        await Promise.all(
          devs.map(async (dev) => {
            try {
              const trust = await getDeviceTrust(client, userId, dev.deviceId)
              if (trust) {
                trustMap.set(dev.deviceId, trust)
              }
            }
            catch {
              // Device may not have encryption keys
            }
          }),
        )
        setTrustStatus(trustMap)
      }
    }
    catch {
      setError(t('devices.error_load'))
    }
    finally {
      setLoading(false)
    }
  }, [t, session?.userId])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const handleRename = async (deviceId: string) => {
    const client = getMatrixClient()
    if (!client || !editName.trim())
      return

    setError(null)
    try {
      await renameDevice(client, deviceId, editName.trim())
      setSuccessWithAutoClear(t('devices.success_renamed'))
      setEditingId(null)
      setEditName('')
      await loadDevices()
    }
    catch {
      setError(t('devices.error_rename'))
    }
  }

  const handleDelete = async (deviceId: string, password?: string, uiaSessionId?: string) => {
    const client = getMatrixClient()
    if (!client)
      return

    setError(null)
    setDeletingId(deviceId)
    try {
      const auth = password
        ? {
            type: 'm.login.password',
            user: session?.userId,
            password,
            ...(uiaSessionId ? { session: uiaSessionId } : {}),
          }
        : undefined
      await deleteDevice(client, deviceId, auth)
      setSuccessWithAutoClear(t('devices.success_deleted'))
      setShowPasswordPrompt(false)
      setUiaPassword('')
      setUiaSession(null)
      setConfirmDeleteId(null)
      await loadDevices()
    }
    catch (err: unknown) {
      const matrixErr = err as { httpStatus?: number, data?: { session?: string, errcode?: string } }
      if (matrixErr.httpStatus === 401 || matrixErr.data?.errcode === 'M_UNAUTHORIZED') {
        setUiaSession(matrixErr.data?.session ?? null)
        setShowPasswordPrompt(true)
        setConfirmDeleteId(deviceId)
      }
      else {
        setError(t('devices.error_delete'))
        setConfirmDeleteId(null)
      }
    }
    finally {
      setDeletingId(null)
    }
  }

  const handleConfirmDelete = (deviceId: string) => {
    setConfirmDeleteId(deviceId)
    setError(null)
  }

  const handleCancelDelete = () => {
    setConfirmDeleteId(null)
    setShowPasswordPrompt(false)
    setUiaPassword('')
    setUiaSession(null)
  }

  const handleVerifyDevice = async (deviceId: string) => {
    const client = getMatrixClient()
    const userId = session?.userId
    if (!client || !userId)
      return

    setError(null)
    setVerifyingId(deviceId)
    try {
      const request = await requestDeviceVerification(client, userId, deviceId)
      setVerificationRequest(request)
    }
    catch {
      setError(t('device_verification.error_start'))
    }
    finally {
      setVerifyingId(null)
    }
  }

  const handleVerificationClose = () => {
    setVerificationRequest(null)
    // Reload devices to refresh verification status
    loadDevices()
  }

  const currentDeviceId = session?.deviceId

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Monitor className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{t('devices.title')}</h3>
      </div>

      {success && (
        <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading
        ? (
            <p className="text-xs text-muted-foreground">{t('app.loading')}</p>
          )
        : devices.length === 0
          ? (
              <p className="text-xs text-muted-foreground">{t('devices.empty')}</p>
            )
          : (
              <div className="space-y-2">
                {devices.map((device) => {
                  const isCurrent = device.deviceId === currentDeviceId
                  const isEditing = editingId === device.deviceId
                  const trust = trustStatus.get(device.deviceId)
                  const isVerified = trust?.verified ?? false

                  return (
                    <div
                      key={device.deviceId}
                      className={`rounded-md border px-3 py-2 ${
                        isCurrent ? 'border-primary/30 bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {isEditing
                            ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="h-7 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter')
                                        handleRename(device.deviceId)
                                      if (e.key === 'Escape') {
                                        setEditingId(null)
                                        setEditName('')
                                      }
                                    }}
                                  />
                                  <Button size="sm" variant="outline" onClick={() => handleRename(device.deviceId)}>
                                    {t('common.save')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingId(null)
                                      setEditName('')
                                    }}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              )
                            : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {device.displayName || device.deviceId}
                                  </span>
                                  {isCurrent && (
                                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                      {t('devices.current')}
                                    </span>
                                  )}
                                  {/* Verification status badge */}
                                  {trust && (
                                    isVerified
                                      ? (
                                          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                                            <ShieldCheck className="h-3 w-3" />
                                            {t('device_verification.status_verified')}
                                          </span>
                                        )
                                      : (
                                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                            <ShieldX className="h-3 w-3" />
                                            {t('device_verification.status_unverified')}
                                          </span>
                                        )
                                  )}
                                </div>
                              )}
                          <div className="mt-0.5 space-y-0.5">
                            <p className="text-xs text-muted-foreground">
                              {t('devices.device_id')}
                              :
                              {device.deviceId}
                            </p>
                            {device.lastSeenIp && (
                              <p className="text-xs text-muted-foreground">
                                {t('devices.last_ip')}
                                :
                                {device.lastSeenIp}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {t('devices.last_seen')}
                              :
                              {formatLastSeen(device.lastSeenTs, t)}
                            </p>
                          </div>
                        </div>

                        {!isEditing && (
                          <div className="flex shrink-0 gap-1">
                            {/* Verify button — only for non-current, unverified devices */}
                            {!isCurrent && !isVerified && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={verifyingId === device.deviceId}
                                onClick={() => handleVerifyDevice(device.deviceId)}
                              >
                                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                                <span className="ml-1 text-xs">
                                  {
                                    verifyingId === device.deviceId
                                      ? t('device_verification.verifying')
                                      : t('device_verification.verify_button')
                                  }
                                </span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(device.deviceId)
                                setEditName(device.displayName || '')
                                setSuccess(null)
                                setError(null)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!isCurrent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === device.deviceId}
                                onClick={() => handleConfirmDelete(device.deviceId)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

      {/* Verification dialog */}
      {verificationRequest && (
        <DeviceVerificationDialog
          request={verificationRequest}
          onClose={handleVerificationClose}
        />
      )}

      {/* Confirm delete dialog */}
      <Dialog
        open={confirmDeleteId !== null && !showPasswordPrompt}
        onOpenChange={(open) => {
          if (!open)
            handleCancelDelete()
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('devices.confirm_delete_title')}</DialogTitle>
            <DialogDescription>{t('devices.confirm_delete_message')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={deletingId !== null}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {t('common.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UIA password prompt dialog */}
      <Dialog
        open={showPasswordPrompt}
        onOpenChange={(open) => {
          if (!open)
            handleCancelDelete()
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('devices.auth_required_title')}</DialogTitle>
            <DialogDescription>{t('devices.auth_required_message')}</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            autoFocus
            placeholder={t('devices.auth_password_placeholder')}
            value={uiaPassword}
            onChange={e => setUiaPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && uiaPassword && confirmDeleteId)
                handleDelete(confirmDeleteId, uiaPassword, uiaSession ?? undefined)
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={!uiaPassword || deletingId !== null}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId, uiaPassword, uiaSession ?? undefined)}
            >
              {t('common.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
