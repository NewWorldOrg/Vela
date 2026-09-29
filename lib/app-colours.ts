import type { ThemePreference } from '@/lib/theme'

export const LIGHT_BG = '#f7f4ed'

export const LIGHT_SURFACE = '#fffdf8'

export const DARK_SURFACE = '#1c1b1f'

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
