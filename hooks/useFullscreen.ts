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
