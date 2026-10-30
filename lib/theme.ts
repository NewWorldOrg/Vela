export const THEME_COOKIE = 'vela-theme-mode'

export const THEME_HEADER = 'x-theme-mode'

export type ThemeMode = 'light' | 'dark'

export type ThemePreference = ThemeMode | 'system'

export function themeOf(said: string | null | undefined): ThemePreference {
  return said === 'light' || said === 'dark' || said === 'system'
    ? said
    : 'system'
}

export const THEME_LABEL: Record<ThemePreference, string> = {
  light: 'ライト',
  dark: 'ダーク',
  system: 'システム',
}
