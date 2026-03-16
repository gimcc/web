import { useAuthStore } from '@matrix-web/matrix-client'
import { useEffect, useMemo } from 'react'
import { RouterProvider } from 'react-router'
import { ConfigProvider } from './providers/config-provider'
import { useConfig } from './providers/use-config'
import { createRouter } from './router'

function AppRouterInner() {
  const { config, isLoading, error } = useConfig()
  const restoreSession = useAuthStore(s => s.restoreSession)
  const setMockMode = useAuthStore(s => s.setMockMode)

  useEffect(() => {
    if (!config)
      return

    const urlMock = import.meta.env.DEV
      && new URLSearchParams(window.location.search).get('mock') === '1'
    setMockMode(config.mockMode || urlMock)
    restoreSession()
  }, [config, restoreSession, setMockMode])

  const router = useMemo(() => {
    if (!config)
      return null
    return createRouter(config)
  }, [config])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">
          Failed to load configuration:
          {' '}
          {error}
        </p>
      </div>
    )
  }

  if (!router) {
    return null
  }

  return <RouterProvider router={router} />
}

export function App() {
  return (
    <ConfigProvider>
      <AppRouterInner />
    </ConfigProvider>
  )
}
