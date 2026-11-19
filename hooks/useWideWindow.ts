'use client'

import { useSyncExternalStore } from 'react'

export const COLUMN_BESIDE = '(min-width: 1181px)'

function isWide(): boolean {
  return window.matchMedia(COLUMN_BESIDE).matches
}

function follow(notify: () => void): () => void {
  const mediaQuery = window.matchMedia(COLUMN_BESIDE)

  mediaQuery.addEventListener('change', notify)

  return () => mediaQuery.removeEventListener('change', notify)
}

function narrowOnTheServer(): boolean {
  return false
}

export function useWideWindow(): boolean {
  return useSyncExternalStore(follow, isWide, narrowOnTheServer)
}
