'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

import { CURTAIN_HOLD_MS } from '@/lib/curtain'
import { VelaMark } from '@/components/vela/marks'

function nothingChanges(): () => void {
  return () => undefined
}

function builtInTheBrowser(): boolean {
  return false
}

function builtFromTheServer(): boolean {
  return true
}

function movementsOf(node: HTMLElement): Animation[] {
  if (typeof node.getAnimations !== 'function') {
    return []
  }

  return node.getAnimations({ subtree: true })
}

function openNow(movements: Animation[]): void {
  for (const running of movements) {
    const at = running.currentTime

    if (typeof at === 'number' && at < CURTAIN_HOLD_MS) {
      running.currentTime = CURTAIN_HOLD_MS
    }
  }
}

/**
 * The curtain drawn closed in the first HTML of every full load: the ground
 * with the mark at its middle, which fades away once the page under it is ready.
 * It rises only over a page hydrated from the server's HTML, never over one
 * built in the browser by a navigation.
 */
export function Curtain() {
  const fromTheServer = useSyncExternalStore(
    nothingChanges,
    builtInTheBrowser,
    builtFromTheServer,
  )
  const [raising, setRaising] = useState<boolean>(fromTheServer)

  const raised = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return
    }

    const movements = movementsOf(node)
    let gone = false

    openNow(movements)
    Promise.all(movements.map((running) => running.finished)).then(
      () => {
        if (!gone) {
          setRaising(false)
        }
      },
      () => undefined,
    )

    return () => {
      gone = true
    }
  }, [])

  if (!raising) {
    return null
  }

  return (
    <div
      ref={raised}
      data-slot="curtain"
      aria-hidden="true"
      className="curtain pointer-events-none fixed inset-0 z-50 grid place-items-center"
    >
      <VelaMark className="size-12" />
    </div>
  )
}
