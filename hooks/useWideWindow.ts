'use client'

import { useSyncExternalStore } from 'react'

/** The narrowest window that lays the live page out with its column beside the player; at this width and below the column goes under it. */
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

/** Whether the window is wide enough for the live page's column to stand beside the player; narrow on the server, where nothing is laid out. */
export function useWideWindow(): boolean {
  return useSyncExternalStore(follow, isWide, narrowOnTheServer)
}
