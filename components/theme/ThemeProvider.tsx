'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'

interface ThemeContextValue {
  /** The theme currently applied (for `system`, the matchMedia result). */
  mode: ThemeMode
  /** The user's selected preference (`light` / `dark` / `system`). */
  preference: ThemePreference
  /** Change the preference explicitly (persisted to a cookie). */
  setPreference: (pref: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const COOKIE_KEY = 'vela-theme-mode'

function writeCookie(value: ThemePreference) {
  document.cookie = `${COOKIE_KEY}=${value};path=/;max-age=31536000;SameSite=Lax`
}

function applyClass(mode: ThemeMode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function resolveSystemMode(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({
  children,
  initialPreference,
}: {
  children: ReactNode
  initialPreference: ThemePreference
}) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(initialPreference)
  const [mode, setMode] = useState<ThemeMode>(() =>
    initialPreference === 'dark' ? 'dark' : 'light',
  )

  // useEffect exception: browser API (window.matchMedia) + listener cleanup.
  useEffect(() => {
    if (preference !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (matches: boolean) => {
      const next: ThemeMode = matches ? 'dark' : 'light'
      setMode(next)
      applyClass(next)
    }

    apply(mediaQuery.matches)

    const listener = (e: MediaQueryListEvent) => apply(e.matches)
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    writeCookie(next)

    if (next === 'system') {
      // Reflect the current OS theme immediately (the effect also handles this,
      // but applying here makes the first paint after selection faster).
      const resolved = resolveSystemMode()
      setMode(resolved)
      applyClass(resolved)
    } else {
      setMode(next)
      applyClass(next)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
