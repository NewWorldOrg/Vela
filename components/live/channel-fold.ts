'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'

import type { FoldMotion, FoldPhase } from '@/lib/live-fold'
import { movesNow } from '@/lib/motion'

const AT_REST: { phase: FoldPhase; staggered: boolean } = {
  phase: 'still',
  staggered: true,
}

/** Whether a fold is drawn at once rather than played: when the person asked for less motion, in the page or in the system. */
export function atOnce(): boolean {
  return !movesNow(
    document.documentElement.dataset.motion,
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
}

export function useFoldingChannels(
  folded: boolean,
  onFold: (folded: boolean) => void,
): {
  motion: FoldMotion
  fold: (next: boolean) => void
  play: (next: boolean) => void
} {
  const [run, setRun] = useState(AT_REST)

  const onSettle = useCallback(() => setRun(AT_REST), [])

  const play = useCallback((next: boolean) => {
    setRun((held) =>
      atOnce()
        ? AT_REST
        : {
            phase: next ? 'closing' : 'opening',
            staggered: held.phase === 'still',
          },
    )
  }, [])

  const fold = useCallback(
    (next: boolean) => {
      onFold(next)
      play(next)
    },
    [onFold, play],
  )

  return {
    motion: {
      shown: !folded || run.phase === 'closing',
      phase: run.phase,
      staggered: run.staggered,
      onSettle,
    },
    fold,
    play,
  }
}

/** Calls `settle` once every transition and animation under `whole` has run out, after a fold or a swap has started playing them. */
export function useSettled(
  whole: RefObject<HTMLElement | null>,
  phase: FoldPhase,
  settle: (() => void) | undefined,
) {
  useEffect(() => {
    const element = whole.current

    if (phase === 'still' || settle === undefined || element === null) {
      return
    }

    const running = element.getAnimations({ subtree: true })

    if (running.length === 0) {
      settle()

      return
    }

    let left = false

    void Promise.allSettled(running.map((one) => one.finished)).then(() => {
      if (!left) {
        settle()
      }
    })

    return () => {
      left = true
    }
  }, [whole, phase, settle])
}
