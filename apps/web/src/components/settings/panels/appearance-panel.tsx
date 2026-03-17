import { Monitor, Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '../../../lib/utils'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'matrix-web-theme'

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system')
      return stored
  }
  catch {
    // localStorage unavailable
  }
  return 'system'
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
  else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

const THEME_OPTIONS: { id: Theme, label: string, icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

export function AppearancePanel() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  const handleChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    try {
      localStorage.setItem(THEME_KEY, newTheme)
    }
    catch {
      // localStorage unavailable
    }
    applyTheme(newTheme)
  }, [])

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system')
      return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  // Apply theme on mount
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
        <p className="text-xs text-muted-foreground">
          Customize the look and feel of the application.
        </p>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-medium text-foreground">Theme</span>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleChange(id)}
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
    </div>
  )
}
