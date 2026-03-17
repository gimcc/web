import type { ThemePreset } from './types'
import { builtInPresets } from './presets'

const PRESET_KEY = 'matrix-web-theme-preset'
const CUSTOM_THEMES_KEY = 'matrix-web-custom-themes'

function readStoredPresetId(): string {
  try {
    return localStorage.getItem(PRESET_KEY) || 'default'
  }
  catch {
    return 'default'
  }
}

function readCustomThemes(): ThemePreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (!raw)
      return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed))
      return []
    return parsed.filter(isValidThemePreset)
  }
  catch {
    return []
  }
}

function saveCustomThemes(themes: ThemePreset[]): void {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
  }
  catch {
    // localStorage unavailable
  }
}

export function isValidThemePreset(obj: unknown): obj is ThemePreset {
  if (typeof obj !== 'object' || obj === null)
    return false
  const t = obj as Record<string, unknown>
  if (typeof t.id !== 'string' || typeof t.name !== 'string')
    return false
  if (typeof t.colors !== 'object' || t.colors === null)
    return false
  const colors = t.colors as Record<string, unknown>
  if (typeof colors.light !== 'object' || typeof colors.dark !== 'object')
    return false
  return true
}

export function getAllPresets(): ThemePreset[] {
  return [...builtInPresets, ...readCustomThemes()]
}

export function getActivePresetId(): string {
  return readStoredPresetId()
}

export function findPreset(id: string): ThemePreset | undefined {
  return getAllPresets().find(p => p.id === id)
}

export function applyPreset(preset: ThemePreset): void {
  const root = document.documentElement
  const isDark = root.classList.contains('dark')
  const colors = isDark ? preset.colors.dark : preset.colors.light

  // Clear all overrides first
  clearPresetOverrides()

  // Apply new overrides
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(key, value)
  }

  try {
    localStorage.setItem(PRESET_KEY, preset.id)
  }
  catch {
    // localStorage unavailable
  }
}

export function clearPresetOverrides(): void {
  const root = document.documentElement
  // Remove all CSS variable overrides set by themes
  const allVars = [
    '--color-primary',
    '--color-primary-foreground',
    '--color-ring',
    '--color-sidebar-primary',
    '--color-sidebar-primary-foreground',
    '--color-secondary',
    '--color-secondary-foreground',
    '--color-accent',
    '--color-accent-foreground',
    '--color-muted',
    '--color-muted-foreground',
    '--color-background',
    '--color-foreground',
    '--color-card',
    '--color-card-foreground',
    '--color-popover',
    '--color-popover-foreground',
    '--color-border',
    '--color-input',
    '--color-destructive',
    '--color-destructive-foreground',
    '--color-sidebar-background',
    '--color-sidebar-foreground',
    '--color-sidebar-accent',
    '--color-sidebar-accent-foreground',
    '--color-sidebar-border',
    '--color-sidebar-ring',
  ]
  for (const v of allVars) {
    root.style.removeProperty(v)
  }
}

export function importTheme(json: string): ThemePreset {
  const parsed = JSON.parse(json) as unknown
  if (!isValidThemePreset(parsed)) {
    throw new Error('Invalid theme format')
  }

  // Ensure unique ID for imported themes
  const preset: ThemePreset = {
    ...parsed,
    id: `custom-${Date.now()}`,
  }

  const customs = readCustomThemes()
  customs.push(preset)
  saveCustomThemes(customs)
  return preset
}

export function exportTheme(preset: ThemePreset): string {
  return JSON.stringify(preset, null, 2)
}

export function removeCustomTheme(id: string): void {
  const customs = readCustomThemes().filter(t => t.id !== id)
  saveCustomThemes(customs)
}

export { builtInPresets } from './presets'
export type { ThemePreset } from './types'
