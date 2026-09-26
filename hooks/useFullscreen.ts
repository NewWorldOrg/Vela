'use client'

import { useSyncExternalStore } from 'react'

export interface FullscreenDocument {
  readonly fullscreenElement: unknown
  addEventListener: (type: 'fullscreenchange', listener: () => void) => void
  removeEventListener: (type: 'fullscreenchange', listener: () => void) => void
}

export function subscribeToFullscreen(
  onChange: () => void,
  on: FullscreenDocument = document,
): () => void {
  on.addEventListener('fullscreenchange', onChange)

  return () => on.removeEventListener('fullscreenchange', onChange)
}

export function isInFullscreen(
  element: Element | null,
  on: FullscreenDocument = document,
): boolean {
  return element !== null && on.fullscreenElement === element
}

function onTheServer(): boolean {
  return false
}

export function useFullscreen(element: Element | null): boolean {
  return useSyncExternalStore(
    subscribeToFullscreen,
    () => isInFullscreen(element),
    onTheServer,
  )
}
