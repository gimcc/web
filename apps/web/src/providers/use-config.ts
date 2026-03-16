import type { AppConfig } from '@matrix-web/config'
import type { ConfigContextValue } from './config-context'
import { use } from 'react'
import { ConfigContext } from './config-context'

export function useConfig(): ConfigContextValue {
  return use(ConfigContext)
}

export function useRequiredConfig(): AppConfig {
  const { config } = useConfig()
  if (!config) {
    throw new Error('Config not loaded yet')
  }
  return config
}
