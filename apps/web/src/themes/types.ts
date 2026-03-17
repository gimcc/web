export interface ThemePreset {
  id: string
  name: string
  colors: {
    light: Record<string, string>
    dark: Record<string, string>
  }
}
