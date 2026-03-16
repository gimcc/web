import type { ReactNode } from 'react'
import type { ConfigContextValue } from './config-context'
import { loadConfig } from '@matrix-web/config'
import { useEffect, useState } from 'react'
import { ConfigContext } from './config-context'

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfigContextValue>({
    config: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    loadConfig()
      .then(config => setState({ config, isLoading: false, error: null }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load config'
        setState({ config: null, isLoading: false, error: message })
      })
  }, [])

  return (
    <ConfigContext value={state}>
      {children}
    </ConfigContext>
  )
}
