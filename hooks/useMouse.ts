'use client'

import { useSyncExternalStore } from 'react'

import { MOUSE } from '@/lib/pointer'

function follow(notify: () => void): () => void {
  const mediaQuery = window.matchMedia(MOUSE)

  mediaQuery.addEventListener('change', notify)

  return () => mediaQuery.removeEventListener('change', notify)
}

function isMouse(): boolean {
  return window.matchMedia(MOUSE).matches
}

function notOnTheServer(): boolean {
  return false
}

/** Whether the screen's pointer can rest over something before pressing it; not on the server, where nothing is pointed at. */
export function useMouse(): boolean {
  return useSyncExternalStore(follow, isMouse, notOnTheServer)
}
