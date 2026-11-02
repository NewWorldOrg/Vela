export const THEME_COOKIE = 'vela-theme-mode'

export const THEME_HEADER = 'x-theme-mode'

export type ThemeMode = 'light' | 'dark'

export type ThemePreference = ThemeMode | 'system'

export function themeOf(said: string | null | undefined): ThemePreference {
  return said === 'light' || said === 'dark' || said === 'system'
    ? said
    : 'system'
}

/** What one press of the theme in the top bar keeps: the other of light and dark, or following the device again when that other is what the device shows. */
export function themeAfterPress(
  shown: ThemeMode,
  device: ThemeMode,
): ThemePreference {
  const next: ThemeMode = shown === 'dark' ? 'light' : 'dark'

  return next === device ? 'system' : next
}

export const THEME_LABEL: Record<ThemePreference, string> = {
  light: 'ライト',
  dark: 'ダーク',
  system: 'システム',
}
