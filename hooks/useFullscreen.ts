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

export interface FullscreenPage {
  readonly fullscreenElement: unknown
  readonly fullscreenEnabled?: boolean
  exitFullscreen: () => Promise<void>
}

export interface FullscreenShell {
  requestFullscreen?: () => Promise<void>
}

declare global {
  interface HTMLVideoElement {
    webkitEnterFullscreen?: () => void
  }
}

export interface FullscreenPicture {
  webkitEnterFullscreen?: () => void
}

function enterThePicturesOwn(picture: FullscreenPicture | null): void {
  try {
    picture?.webkitEnterFullscreen?.()
  } catch {
    return
  }
}

/** Leaves fullscreen, or takes it for the shell, or else for the picture alone where the page has no element fullscreen to give. */
export function switchFullscreen(
  shell: FullscreenShell | null,
  picture: FullscreenPicture | null,
  on: FullscreenPage = document,
): void {
  if (on.fullscreenElement) {
    void on.exitFullscreen().catch(() => undefined)

    return
  }

  if (!shell?.requestFullscreen || on.fullscreenEnabled === false) {
    enterThePicturesOwn(picture)

    return
  }

  void shell.requestFullscreen().catch(() => enterThePicturesOwn(picture))
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
