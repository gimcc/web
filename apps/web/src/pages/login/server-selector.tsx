import type { HomeserversConfig } from '@matrix-web/types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface ServerSelectorProps {
  config: HomeserversConfig
  value: string
  onChange: (url: string) => void
}

function isValidServerUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  }
  catch {
    return false
  }
}

export function ServerSelector({ config, value, onChange }: ServerSelectorProps) {
  const { t } = useTranslation()
  const [customUrl, setCustomUrl] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  if (!config.showSelector) {
    return null
  }

  const handleServerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value
    if (selected === '__custom__') {
      setIsCustom(true)
      onChange('')
    }
    else {
      setIsCustom(false)
      onChange(selected)
    }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomUrl(val)
    if (isValidServerUrl(val)) {
      onChange(val)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground" htmlFor="server-select">
        {t('auth_server.server')}
      </label>
      <select
        id="server-select"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
        value={isCustom ? '__custom__' : value}
        onChange={handleServerSelect}
      >
        {config.servers.map(server => (
          <option key={server.url} value={server.url}>
            {server.name}
          </option>
        ))}
        {config.allowCustom && (
          <option value="__custom__">{t('auth_server.custom_server')}</option>
        )}
      </select>
      {isCustom && (
        <input
          type="url"
          placeholder={t('auth.custom_server_placeholder')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          value={customUrl}
          onChange={handleCustomChange}
        />
      )}
    </div>
  )
}
