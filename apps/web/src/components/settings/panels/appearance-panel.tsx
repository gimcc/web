import { Download, Globe, Monitor, Moon, Palette, Sun, Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../hooks/use-theme'
import { cn } from '../../../lib/utils'
import {
  applyPreset,
  clearPresetOverrides,
  exportTheme,
  getActivePresetId,
  getAllPresets,
  importTheme,
} from '../../../themes'

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
] as const

export function AppearancePanel() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [activePresetId, setActivePresetId] = useState(getActivePresetId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const themeOptions = [
    { id: 'light' as const, label: t('appearance.theme_light'), icon: Sun },
    { id: 'dark' as const, label: t('appearance.theme_dark'), icon: Moon },
    { id: 'system' as const, label: t('appearance.theme_system'), icon: Monitor },
  ]

  const presets = getAllPresets()

  const handlePresetSelect = useCallback((presetId: string) => {
    if (presetId === 'default') {
      clearPresetOverrides()
      try {
        localStorage.setItem('matrix-web-theme-preset', 'default')
      }
      catch {
        // localStorage unavailable
      }
    }
    else {
      const preset = presets.find(p => p.id === presetId)
      if (preset)
        applyPreset(preset)
    }
    setActivePresetId(presetId)
  }, [presets])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file)
      return

    setImportError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const preset = importTheme(reader.result as string)
        applyPreset(preset)
        setActivePresetId(preset.id)
      }
      catch {
        setImportError('Invalid theme file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleExport = useCallback(() => {
    const preset = presets.find(p => p.id === activePresetId)
    if (!preset)
      return

    const json = exportTheme(preset)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${preset.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [presets, activePresetId])

  const handleLanguageChange = useCallback((lng: string) => {
    i18n.changeLanguage(lng)
  }, [i18n])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('appearance.title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('appearance.description')}
        </p>
      </div>

      {/* Theme mode */}
      <div className="space-y-3">
        <span className="text-xs font-medium text-foreground">{t('appearance.theme')}</span>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                theme === id
                  ? 'border-primary bg-accent text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color theme presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{t('appearance.color_theme')}</span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Upload className="mr-1 inline h-3 w-3" />
              {t('appearance.import_theme')}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={activePresetId === 'default'}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <Download className="mr-1 inline h-3 w-3" />
              {t('appearance.export_theme')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
        {importError && (
          <p className="text-xs text-destructive">{importError}</p>
        )}
        <div className="grid grid-cols-4 gap-2">
          {presets.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors',
                activePresetId === preset.id
                  ? 'border-primary bg-accent text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50',
              )}
            >
              <div className="flex gap-1">
                {preset.id === 'default'
                  ? <div className="h-4 w-4 rounded-full border border-border bg-foreground" />
                  : Object.entries(preset.colors.light).slice(0, 3).map(([key, color]) => (
                      <div
                        key={key}
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
              </div>
              <span className="text-[10px] font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t('appearance.language')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGE_OPTIONS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => handleLanguageChange(code)}
              className={cn(
                'rounded-lg border px-4 py-2.5 text-sm transition-colors',
                i18n.language === code
                  ? 'border-primary bg-accent font-medium text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
