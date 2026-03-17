import {
  exportDek,
  generateDek,
  hasDekStored,
  hasPasswordSet,
  loadDekPlaintext,
  persistDekPlaintext,
  useAuthStore,
  useLockStore,
} from '@matrix-web/matrix-client'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router'
import { useIdleDetector } from './hooks/use-idle-detector'
import { useThemeInit } from './hooks/use-theme'
import { LockScreen } from './pages/lock/lock-screen'
import { ConfigProvider } from './providers/config-provider'
import { QueryProvider } from './providers/query-provider'
import { useConfig } from './providers/use-config'
import { createRouter } from './router'

function noop() {}

/**
 * Initialize DEK on app startup:
 * - No DEK stored: generate a new one (first-time user, stored plaintext)
 * - DEK stored + no password: load plaintext DEK
 * - DEK stored + password: mark as locked (lock screen will handle loading)
 */
async function initializeDek(): Promise<void> {
  const lockStore = useLockStore.getState()

  if (!hasDekStored()) {
    // First time — generate DEK and persist plaintext
    const dek = await generateDek()
    const dekRaw = await exportDek(dek)
    persistDekPlaintext(dekRaw)
    lockStore.setDek(dek)
    lockStore.setHasPassword(false)
    return
  }

  if (hasPasswordSet()) {
    // Password is set — mark as locked, don't load DEK yet
    lockStore.setHasPassword(true)
    lockStore.lock()
    return
  }

  // No password — load DEK directly
  const dek = await loadDekPlaintext()
  lockStore.setDek(dek)
  lockStore.setHasPassword(false)
}

function useAutoLock() {
  const hasPassword = useLockStore(s => s.hasPassword)
  const isLocked = useLockStore(s => s.isLocked)
  const idleTimeout = useLockStore(s => s.idleTimeout)
  const lock = useLockStore(s => s.lock)

  const enabled = hasPassword && !isLocked && idleTimeout > 0
  const timeoutMs = idleTimeout * 1000

  const handleIdle = useCallback(() => {
    const { hasPassword: hp, isLocked: il } = useLockStore.getState()
    if (hp && !il)
      lock()
  }, [lock])

  useIdleDetector(handleIdle, noop, enabled ? timeoutMs : 0)
}

function AppRouterInner() {
  const { config, isLoading, error } = useConfig()
  const restoreSession = useAuthStore(s => s.restoreSession)
  const setMockMode = useAuthStore(s => s.setMockMode)
  const isLocked = useLockStore(s => s.isLocked)
  const { t } = useTranslation()

  useAutoLock()
  useThemeInit()

  useEffect(() => {
    if (!config)
      return

    const urlMock = import.meta.env.DEV
      && new URLSearchParams(window.location.search).get('mock') === '1'
    setMockMode(import.meta.env.DEV && (config.mockMode || urlMock))
    restoreSession()
    initializeDek().catch((err) => {
      console.error('Failed to initialize DEK:', err)
    })
  }, [config, restoreSession, setMockMode])

  const router = useMemo(() => {
    if (!config)
      return null
    return createRouter(config)
  }, [config])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('app.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">
          {t('app.error.config', { error })}
        </p>
      </div>
    )
  }

  if (!router) {
    return null
  }

  if (isLocked) {
    return <LockScreen />
  }

  return <RouterProvider router={router} />
}

export function App() {
  return (
    <QueryProvider>
      <ConfigProvider>
        <AppRouterInner />
      </ConfigProvider>
    </QueryProvider>
  )
}
