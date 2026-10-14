'use client'

import { useCallback, useSyncExternalStore } from 'react'

function nothingToFollow(): () => void {
  return () => undefined
}

function noWidth(): number {
  return 0
}

/** The element's laid-out width in CSS pixels, following it as it changes: 0 for no element, and on the server. */
export function useWidth(element: HTMLElement | null): number {
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
    () => (element ? element.getBoundingClientRect().width : 0),
    noWidth,
  )
}
