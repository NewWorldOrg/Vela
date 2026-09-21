'use client'

import { useEffect, useState } from 'react'

import { ARRIVAL_SPAN_MS } from '@/lib/arrival'

export type Arrived = { 'data-arrived'?: '' }

/*
 * A list hands this to the box around its parts. It says nothing while the
 * parts are arriving and marks the box the moment the procession is over — or
 * the moment the reader scrolls, whichever comes first, because a part that
 * moves under a scroll reads as the page fighting the hand.
 */
export function useArrived(): Arrived {
  const [arrived, setArrived] = useState<boolean>(false)

  useEffect(() => {
    const done = (): void => setArrived(true)
    const timer = setTimeout(done, ARRIVAL_SPAN_MS)

    window.addEventListener('scroll', done, { capture: true, passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', done, { capture: true })
    }
  }, [])

  return arrived ? { 'data-arrived': '' } : {}
}
