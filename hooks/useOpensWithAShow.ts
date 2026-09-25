'use client'

import { useState, useSyncExternalStore } from 'react'

import { movesNow } from '@/lib/motion'

const listenToNothing = (): (() => void) => () => undefined

export function useOpensWithAShow(): boolean {
  const cameWithTheHtml = useSyncExternalStore(
    listenToNothing,
    () => false,
    () => true,
  )
  const [shows] = useState(
    () =>
      !cameWithTheHtml &&
      movesNow(
        document.documentElement.dataset.motion,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
  )

  return shows
}
