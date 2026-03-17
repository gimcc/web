import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { applyPreset, findPreset, getActivePresetId } from '../themes'

export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'matrix-web-theme'

const listeners = new Set<() => void>()
let currentTheme: Theme = readStoredTheme()

function readStoredTheme(): Theme {
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

function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
  else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

function reapplyActivePreset(): void {
  const presetId = getActivePresetId()
  if (presetId && presetId !== 'default') {
    const preset = findPreset(presetId)
    if (preset)
      applyPreset(preset)
  }
}

function notify(): void {
  for (const listener of listeners)
    listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Theme {
  return currentTheme
}

export function setTheme(theme: Theme): void {
  currentTheme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  }
  catch {
    // localStorage unavailable
  }
  applyThemeToDOM(theme)
  reapplyActivePreset()
  notify()
}

/**
 * App-level hook: initializes theme on mount and listens for system preference changes.
 * Call once at the top of the component tree.
 */
export function useThemeInit(): void {
  // Apply persisted theme and preset on mount
  useEffect(() => {
    applyThemeToDOM(currentTheme)
    reapplyActivePreset()
  }, [])

  // Listen for system preference changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (currentTheme === 'system') {
        applyThemeToDOM('system')
        reapplyActivePreset()
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
}

/**
 * Read the current theme reactively. Use in UI components that display theme state.
 */
export function useTheme(): { theme: Theme, setTheme: (t: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { theme, setTheme: useCallback((t: Theme) => setTheme(t), []) }
}
