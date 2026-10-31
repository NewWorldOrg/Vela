import type { ThemePreference } from '@/lib/theme'

export const LIGHT_BG = '#ffffff'

export const DARK_BG = '#0e0e10'

const SYSTEM_LIGHT = '(prefers-color-scheme: light)'

const SYSTEM_DARK = '(prefers-color-scheme: dark)'

export interface StatusBarColour {
  media?: string
  color: string
}

/** The colours of the status bar above the top bar, which wears the ground, for the theme a person chose. */
export function statusBarColours(
  preference: ThemePreference,
): StatusBarColour[] {
  if (preference === 'light') {
    return [{ color: LIGHT_BG }]
  }

  if (preference === 'dark') {
    return [{ color: DARK_BG }]
  }

  return [
    { media: SYSTEM_LIGHT, color: LIGHT_BG },
    { media: SYSTEM_DARK, color: DARK_BG },
  ]
}
