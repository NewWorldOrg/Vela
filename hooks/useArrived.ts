'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { ARRIVAL_SPAN_MS } from '@/lib/arrival'

const MOVED_BY_HAND = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const

export type Arrived = { ref: (element: HTMLElement | null) => void }

export function useArrived(): Arrived {
  const held = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const done = (): void => {
      if (held.current !== null) {
        held.current.setAttribute('data-arrived', '')
      }
    }
    const timer = setTimeout(done, ARRIVAL_SPAN_MS)

    for (const input of MOVED_BY_HAND) {
      window.addEventListener(input, done, { capture: true, passive: true })
    }

    return () => {
      clearTimeout(timer)
      for (const input of MOVED_BY_HAND) {
        window.removeEventListener(input, done, { capture: true })
      }
    }
  }, [])

  const ref = useCallback((element: HTMLElement | null): void => {
    held.current = element
  }, [])

  return useMemo(() => ({ ref }), [ref])
}
