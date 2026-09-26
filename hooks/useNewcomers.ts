'use client'

import { useState } from 'react'

import { newcomersOf } from '@/lib/arrival'

export function useNewcomers(ids: readonly string[]): Set<string> {
  const lineUp = ids.join('\n')
  const [held, setHeld] = useState<{ lineUp: string; newcomers: Set<string> }>(
    () => ({ lineUp, newcomers: new Set() }),
  )

  if (held.lineUp !== lineUp) {
    setHeld({
      lineUp,
      newcomers: newcomersOf(held.lineUp.split('\n'), ids),
    })
  }

  return held.newcomers
}
