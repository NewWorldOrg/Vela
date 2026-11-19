'use client'

import { useCallback, useSyncExternalStore } from 'react'

function nothingToFollow(): () => void {
  return () => undefined
}

function noHeight(): number {
  return 0
}

export function useHeight(element: HTMLElement | null): number {
  const follow = useCallback(
    (notify: () => void) => {
      if (!element) {
        return nothingToFollow()
      }

      const resizing = new ResizeObserver(notify)

      resizing.observe(element)

      return () => resizing.disconnect()
    },
    [element],
  )

  return useSyncExternalStore(
    follow,
    () => (element ? Math.ceil(element.getBoundingClientRect().height) : 0),
    noHeight,
  )
}
