import type { ThemePreset } from './types'

export const builtInPresets: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      light: {},
      dark: {},
    },
  },
  {
    id: 'blue',
    name: 'Blue',
    colors: {
      light: {
        '--color-primary': 'oklch(0.488 0.243 264.376)',
        '--color-primary-foreground': 'oklch(0.985 0 0)',
        '--color-ring': 'oklch(0.488 0.243 264.376)',
        '--color-sidebar-primary': 'oklch(0.488 0.243 264.376)',
        '--color-sidebar-primary-foreground': 'oklch(0.985 0 0)',
      },
      dark: {
        '--color-primary': 'oklch(0.672 0.199 264.376)',
        '--color-primary-foreground': 'oklch(0.145 0.017 285.823)',
        '--color-ring': 'oklch(0.672 0.199 264.376)',
        '--color-sidebar-primary': 'oklch(0.672 0.199 264.376)',
        '--color-sidebar-primary-foreground': 'oklch(0.145 0.017 285.823)',
      },
    },
  },
  {
    id: 'green',
    name: 'Green',
    colors: {
      light: {
        '--color-primary': 'oklch(0.520 0.175 152)',
        '--color-primary-foreground': 'oklch(0.985 0 0)',
        '--color-ring': 'oklch(0.520 0.175 152)',
        '--color-sidebar-primary': 'oklch(0.520 0.175 152)',
        '--color-sidebar-primary-foreground': 'oklch(0.985 0 0)',
      },
      dark: {
        '--color-primary': 'oklch(0.696 0.175 152)',
        '--color-primary-foreground': 'oklch(0.145 0.017 285.823)',
        '--color-ring': 'oklch(0.696 0.175 152)',
        '--color-sidebar-primary': 'oklch(0.696 0.175 152)',
        '--color-sidebar-primary-foreground': 'oklch(0.145 0.017 285.823)',
      },
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      light: {
        '--color-primary': 'oklch(0.577 0.230 9)',
        '--color-primary-foreground': 'oklch(0.985 0 0)',
        '--color-ring': 'oklch(0.577 0.230 9)',
        '--color-sidebar-primary': 'oklch(0.577 0.230 9)',
        '--color-sidebar-primary-foreground': 'oklch(0.985 0 0)',
      },
      dark: {
        '--color-primary': 'oklch(0.720 0.200 9)',
        '--color-primary-foreground': 'oklch(0.145 0.017 285.823)',
        '--color-ring': 'oklch(0.720 0.200 9)',
        '--color-sidebar-primary': 'oklch(0.720 0.200 9)',
        '--color-sidebar-primary-foreground': 'oklch(0.145 0.017 285.823)',
      },
    },
  },
]
