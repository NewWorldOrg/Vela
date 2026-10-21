'use client'

import { useSyncExternalStore } from 'react'

/** The window narrower than 430px, where the player's control row folds into three lines over the picture. */
export const CONTROLS_FOLD = '(max-width: 429.98px)'

function isNarrow(): boolean {
  return window.matchMedia(CONTROLS_FOLD).matches
}

function follow(notify: () => void): () => void {
  const mediaQuery = window.matchMedia(CONTROLS_FOLD)

  mediaQuery.addEventListener('change', notify)

  return () => mediaQuery.removeEventListener('change', notify)
}

function wideOnTheServer(): boolean {
  return false
}

/** Whether the window is narrow enough for the player's control row to fold into three lines; not narrow on the server, where nothing is laid out. */
export function useNarrowWindow(): boolean {
  return useSyncExternalStore(follow, isNarrow, wideOnTheServer)
}
