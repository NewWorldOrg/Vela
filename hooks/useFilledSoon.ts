'use client'

import {
  startTransition,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'

const listenToNothing = (): (() => void) => () => undefined

export function useFilledSoon(): boolean {
  const cameWithTheHtml = useSyncExternalStore(
    listenToNothing,
    () => false,
    () => true,
  )
  const [filled, setFilled] = useState(cameWithTheHtml)

  useEffect(() => {
    if (!filled) {
      startTransition(() => setFilled(true))
    }
  }, [filled])

  return filled
}
