import type { ThemePreference } from '@/lib/theme'

export const LIGHT_BG = '#ffffff'

export const LIGHT_SURFACE = '#f4f4f5'

export const DARK_SURFACE = '#1a1a1e'

const SYSTEM_LIGHT = '(prefers-color-scheme: light)'

const SYSTEM_DARK = '(prefers-color-scheme: dark)'

export interface StatusBarColour {
  media?: string
  color: string
}

/** The colours of the status bar above the top bar, for the theme a person chose. */
export function statusBarColours(
  preference: ThemePreference,
): StatusBarColour[] {
  if (preference === 'light') {
    return [{ color: LIGHT_SURFACE }]
  }

  if (preference === 'dark') {
    return [{ color: DARK_SURFACE }]
  }

  return [
    { media: SYSTEM_LIGHT, color: LIGHT_SURFACE },
    { media: SYSTEM_DARK, color: DARK_SURFACE },
  ]
}
