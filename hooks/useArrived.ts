'use client'

import { useEffect, useState } from 'react'

import { ARRIVAL_SPAN_MS } from '@/lib/arrival'

export type Arrived = { 'data-arrived'?: '' }

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
