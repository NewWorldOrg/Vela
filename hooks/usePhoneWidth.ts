'use client'

import { useSyncExternalStore } from 'react'

/** The window a phone held upright gives: under 600px wide. */
export const PHONE_WIDTH = '(width < 600px)'

function isPhone(): boolean {
  return window.matchMedia(PHONE_WIDTH).matches
}

function follow(notify: () => void): () => void {
  const mediaQuery = window.matchMedia(PHONE_WIDTH)

  mediaQuery.addEventListener('change', notify)

  return () => mediaQuery.removeEventListener('change', notify)
}

function wideOnTheServer(): boolean {
  return false
}

/** Whether the window is a phone's upright width; wide on the server, where nothing is laid out. */
export function usePhoneWidth(): boolean {
  return useSyncExternalStore(follow, isPhone, wideOnTheServer)
}
