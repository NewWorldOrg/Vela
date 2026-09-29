'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { statusBarColours } from '@/lib/app-colours'
import { THEME_COOKIE, type ThemeMode, type ThemePreference } from '@/lib/theme'

interface ThemeContextValue {
  mode: ThemeMode
  preference: ThemePreference
  setPreference: (pref: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const SYSTEM_DARK = '(prefers-color-scheme: dark)'

function writeCookie(value: ThemePreference) {
  document.cookie = `${THEME_COOKIE}=${value};path=/;max-age=31536000;SameSite=Lax`
}

function applyClass(preference: ThemePreference) {
  const { classList } = document.documentElement

  classList.toggle('dark', preference === 'dark')
  classList.toggle('system', preference === 'system')
}

function paintStatusBar(preference: ThemePreference) {
  const { head } = document

  for (const added of head.querySelectorAll(
    'meta[name="theme-color"][data-painted]',
  )) {
    added.remove()
  }

  const said = [
    ...head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  ]
  const colours = statusBarColours(preference)

  colours.forEach(({ media, color }, nth) => {
    let meta = said[nth]

    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.dataset.painted = ''
      head.append(meta)
    }
    meta.content = color
    if (media) {
      meta.media = media
    } else {
      meta.removeAttribute('media')
    }
  })

  for (const extra of said.slice(colours.length)) {
    extra.content = colours[0].color
    extra.removeAttribute('media')
  }
}

function systemMode(dark: boolean): ThemeMode {
  return dark ? 'dark' : 'light'
}

function systemIsDark(): boolean {
  return window.matchMedia(SYSTEM_DARK).matches
}

function followSystem(notify: () => void): () => void {
  const mediaQuery = window.matchMedia(SYSTEM_DARK)

  mediaQuery.addEventListener('change', notify)

  return () => mediaQuery.removeEventListener('change', notify)
}

function systemIsDarkOnTheServer(): boolean {
  return false
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

  const systemDark = useSyncExternalStore(
    followSystem,
    systemIsDark,
    systemIsDarkOnTheServer,
  )

  const mode: ThemeMode =
    preference === 'system' ? systemMode(systemDark) : preference

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    writeCookie(next)
    applyClass(next)
    paintStatusBar(next)
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
