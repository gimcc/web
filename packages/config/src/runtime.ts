import { z } from 'zod/v4'

const homeserverEntrySchema = z.object({
  name: z.string().min(1),
  url: z.url(),
})

const homeserversConfigSchema = z.object({
  default: z.string().min(1),
  servers: z.array(homeserverEntrySchema).min(1),
  allowCustom: z.boolean(),
  showSelector: z.boolean(),
})

const appConfigSchema = z.object({
  routerMode: z.enum(['hash', 'history']),
  basePath: z.string(),
  homeservers: homeserversConfigSchema,
  hideServerName: z.boolean(),
  lockIdleTimeout: z.number().int().positive(),
  mockMode: z.boolean(),
})

export type AppConfig = z.infer<typeof appConfigSchema>

let cachedConfig: AppConfig | null = null

export async function loadConfig(path: string): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status} ${response.statusText}`)
  }

  const json: unknown = await response.json()
  const config = appConfigSchema.parse(json)
  cachedConfig = config
  return config
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    throw new Error('Config not loaded. Call loadConfig() first.')
  }
  return cachedConfig
}

export function resetConfig(): void {
  cachedConfig = null
}
