'use client'

import { useSyncExternalStore } from 'react'

const COARSE = '(pointer: coarse)'

function isCoarse(): boolean {
  return window.matchMedia(COARSE).matches
}

function follow(notify: () => void): () => void {
  const mediaQuery = window.matchMedia(COARSE)

  mediaQuery.addEventListener('change', notify)

  return () => mediaQuery.removeEventListener('change', notify)
}

function fineOnTheServer(): boolean {
  return false
}

/** Whether the primary pointer is a finger rather than a mouse, as `(pointer: coarse)` says; a mouse on the server, where nothing points. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(follow, isCoarse, fineOnTheServer)
}
