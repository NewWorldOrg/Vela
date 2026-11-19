'use client'

import { useSyncExternalStore } from 'react'

const listenToNothing = (): (() => void) => () => undefined

export function useCameWithTheHtml(): boolean {
  return useSyncExternalStore(
    listenToNothing,
    () => false,
    () => true,
  )
}
