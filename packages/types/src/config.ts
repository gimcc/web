export interface HomeserverEntry {
  name: string
  url: string
}

export interface HomeserversConfig {
  default: string
  servers: HomeserverEntry[]
  allowCustom: boolean
  showSelector: boolean
}

export interface AppConfig {
  routerMode: 'hash' | 'history'
  basePath: string
  homeservers: HomeserversConfig
  hideServerName: boolean
  lockIdleTimeout: number
  mockMode: boolean
}
