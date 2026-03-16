import type { AppConfig } from '@matrix-web/config'
import { createContext } from 'react'

export interface ConfigContextValue {
  config: AppConfig | null
  isLoading: boolean
  error: string | null
}

export const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  isLoading: true,
  error: null,
})
