'use client'

import { useCallback, useState } from 'react'

import type { FoldMotion, FoldPhase } from '@/lib/live-fold'

const AT_REST: { phase: FoldPhase; staggered: boolean } = {
  phase: 'still',
  staggered: true,
}

function atOnce(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useFoldingChannels(
  folded: boolean,
  onFold: (folded: boolean) => void,
): { motion: FoldMotion; fold: (next: boolean) => void } {
  const [run, setRun] = useState(AT_REST)

  const onSettle = useCallback(() => setRun(AT_REST), [])

  const fold = useCallback(
    (next: boolean) => {
      onFold(next)
      setRun((held) =>
        atOnce()
          ? AT_REST
          : {
              phase: next ? 'closing' : 'opening',
              staggered: held.phase === 'still',
            },
      )
    },
    [onFold],
  )

  return {
    motion: {
      shown: !folded || run.phase === 'closing',
      phase: run.phase,
      staggered: run.staggered,
      onSettle,
    },
    fold,
  }
}
