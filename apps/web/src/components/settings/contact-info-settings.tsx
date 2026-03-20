import type { ThreePid } from '@matrix-web/matrix-client'
import type { FormEvent } from 'react'
import {
  addThreePid,
  deleteThreePid,
  getMatrixClient,
  getThreePids,
  requestEmailToken,
  requestMsisdnToken,
} from '@matrix-web/matrix-client'
import { Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

type AddMode = 'idle' | 'email' | 'phone' | 'verify'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COUNTRY_CODE_REGEX = /^\+\d{1,3}$/

function generateClientSecret(): string {
  return `mw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function ContactInfoSettings() {
  const { t } = useTranslation()
  const [threePids, setThreePids] = useState<ThreePid[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<AddMode>('idle')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+1')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingSid, setPendingSid] = useState<string | null>(null)
  const [pendingSecret, setPendingSecret] = useState<string | null>(null)
  const [pendingMedium, setPendingMedium] = useState<'email' | 'msisdn' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ medium: string, address: string } | null>(null)

  const setSuccessWithAutoClear = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const loadThreePids = useCallback(async () => {
    const client = getMatrixClient()
    if (!client)
      return
    try {
      const pids = await getThreePids(client)
      setThreePids(pids)
    }
    catch {
      setError(t('contact_info.error_load'))
    }
    finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadThreePids()
  }, [loadThreePids])

  const resetForm = () => {
    setMode('idle')
    setEmail('')
    setPhoneNumber('')
    setCountryCode('+1')

    setError(null)
    setPendingSid(null)
    setPendingSecret(null)
    setPendingMedium(null)
  }

  const handleRequestEmail = async (e: FormEvent) => {
    e.preventDefault()
    const client = getMatrixClient()
    if (!client || !email)
      return

    if (!EMAIL_REGEX.test(email)) {
      setError(t('contact_info.error_invalid_email'))
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const secret = generateClientSecret()
      const sid = await requestEmailToken(client, email, secret, 1)
      setPendingSid(sid)
      setPendingSecret(secret)
      setPendingMedium('email')
      setMode('verify')
      setSuccess(null)
    }
    catch {
      setError(t('contact_info.error_request_token'))
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestPhone = async (e: FormEvent) => {
    e.preventDefault()
    const client = getMatrixClient()
    if (!client || !phoneNumber)
      return

    if (!COUNTRY_CODE_REGEX.test(countryCode)) {
      setError(t('contact_info.error_invalid_country_code'))
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const secret = generateClientSecret()
      const cleanCode = countryCode.replace('+', '')
      const sid = await requestMsisdnToken(client, phoneNumber, cleanCode, secret, 1)
      setPendingSid(sid)
      setPendingSecret(secret)
      setPendingMedium('msisdn')
      setMode('verify')
      setSuccess(null)
    }
    catch {
      setError(t('contact_info.error_request_token'))
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    const client = getMatrixClient()
    if (!client || !pendingSid || !pendingSecret)
      return

    setError(null)
    setIsSubmitting(true)
    try {
      await addThreePid(client, pendingSecret, pendingSid)
      setSuccessWithAutoClear(t('contact_info.success_added'))
      resetForm()
      await loadThreePids()
    }
    catch {
      setError(t('contact_info.error_verify'))
    }
    finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (medium: string, address: string) => {
    const client = getMatrixClient()
    if (!client)
      return

    setError(null)
    setConfirmDelete(null)
    try {
      await deleteThreePid(client, medium, address)
      setSuccessWithAutoClear(t('contact_info.success_removed'))
      await loadThreePids()
    }
    catch {
      setError(t('contact_info.error_remove'))
    }
  }

  const emails = threePids.filter(p => p.medium === 'email')
  const phones = threePids.filter(p => p.medium === 'msisdn')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{t('contact_info.title')}</h3>
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
        : (
            <>
              {/* Email addresses */}
              {emails.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('contact_info.emails')}</p>
                  {emails.map(pid => (
                    <div key={pid.address} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{pid.address}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ medium: pid.medium, address: pid.address })}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Phone numbers */}
              {phones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('contact_info.phones')}</p>
                  {phones.map(pid => (
                    <div key={pid.address} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{pid.address}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ medium: pid.medium, address: pid.address })}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {emails.length === 0 && phones.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('contact_info.empty')}</p>
              )}
            </>
          )}

      {/* Add buttons */}
      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSuccess(null)
              setError(null)
              setMode('email')
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('contact_info.add_email')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSuccess(null)
              setError(null)
              setMode('phone')
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('contact_info.add_phone')}
          </Button>
        </div>
      )}

      {/* Add email form */}
      {mode === 'email' && (
        <form onSubmit={handleRequestEmail} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="add-email">
              {t('contact_info.email_label')}
            </label>
            <Input
              id="add-email"
              type="email"
              autoFocus
              placeholder={t('contact_info.email_placeholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={isSubmitting || !email}>
              {isSubmitting ? t('contact_info.sending') : t('contact_info.send_verification')}
            </Button>
          </div>
        </form>
      )}

      {/* Add phone form */}
      {mode === 'phone' && (
        <form onSubmit={handleRequestPhone} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="add-phone">
              {t('contact_info.phone_label')}
            </label>
            <div className="flex gap-2">
              <Input
                className="w-20"
                value={countryCode}
                onChange={(e) => {
                  let val = e.target.value
                  if (val && !val.startsWith('+'))
                    val = `+${val}`
                  setCountryCode(val)
                }}
                placeholder="+1"
                maxLength={4}
              />
              <Input
                id="add-phone"
                type="tel"
                autoFocus
                placeholder={t('contact_info.phone_placeholder')}
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={isSubmitting || !phoneNumber}>
              {isSubmitting ? t('contact_info.sending') : t('contact_info.send_verification')}
            </Button>
          </div>
        </form>
      )}

      {/* Verification form */}
      {mode === 'verify' && (
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {pendingMedium === 'email'
              ? t('contact_info.verify_email_hint')
              : t('contact_info.verify_phone_hint')}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? t('contact_info.verifying') : t('contact_info.confirm_verify')}
            </Button>
          </div>
        </form>
      )}

      {/* Confirm delete dialog */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('contact_info.confirm_delete_title')}</DialogTitle>
            <DialogDescription>
              {t('contact_info.confirm_delete_message', { address: confirmDelete?.address })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete.medium, confirmDelete.address)}
            >
              {t('common.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
