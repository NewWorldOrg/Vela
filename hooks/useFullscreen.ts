'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

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

/** Leaves fullscreen, or takes it for the shell, or else fills the window with the shell where the page has no element fullscreen to give. */
export function switchFullscreen(
  shell: FullscreenShell | null,
  filled: boolean,
  fill: (filled: boolean) => void,
  on: FullscreenPage = document,
): void {
  if (on.fullscreenElement) {
    void on.exitFullscreen().catch(() => undefined)

    return
  }

  if (filled) {
    fill(false)

    return
  }

  if (!shell) {
    return
  }

  if (!shell.requestFullscreen || on.fullscreenEnabled === false) {
    fill(true)

    return
  }

  void shell.requestFullscreen().catch(() => fill(true))
}

export interface ScrollablePage {
  readonly style: { overflow: string }
}

/** Stops the page from scrolling, and hands back what puts it as it was. */
export function holdStill(page: ScrollablePage): () => void {
  const was = page.style.overflow

  page.style.overflow = 'hidden'

  return () => {
    page.style.overflow = was
  }
}

export interface PressedKey {
  readonly key: string
  readonly defaultPrevented: boolean
}

export function leavesTheFill(event: PressedKey): boolean {
  return event.key === 'Escape' && !event.defaultPrevented
}

function onTheServer(): boolean {
  return false
}

export interface Fullscreen {
  full: boolean
  filled: boolean
  toggle: () => void
}

/** Whether the shell is in fullscreen, either the element's own or filling the window, and the switch between them. */
export function useFullscreen(shell: Element | null): Fullscreen {
  const whole = useSyncExternalStore(
    subscribeToFullscreen,
    () => isInFullscreen(shell),
    onTheServer,
  )
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    if (!filled) {
      return
    }

    const letGo = [
      holdStill(document.documentElement),
      holdStill(document.body),
    ]
    const onKeyDown = (event: KeyboardEvent) => {
      if (leavesTheFill(event)) {
        setFilled(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      letGo.forEach((putBack) => putBack())
    }
  }, [filled])

  return {
    full: whole || filled,
    filled,
    toggle: () => switchFullscreen(shell, filled, setFilled),
  }
}
