'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { ARRIVAL_SPAN_MS } from '@/lib/arrival'

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

    window.addEventListener('scroll', done, { capture: true, passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', done, { capture: true })
    }
  }, [])

  const ref = useCallback((element: HTMLElement | null): void => {
    held.current = element
  }, [])

  return useMemo(() => ({ ref }), [ref])
}
