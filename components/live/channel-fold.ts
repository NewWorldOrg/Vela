'use client'

import { useCallback, useState } from 'react'

export type FoldPhase = 'still' | 'opening' | 'closing'

export interface FoldMotion {
  shown: boolean
  phase: FoldPhase
  staggered: boolean
  onSettle: () => void
}

const AT_REST: { phase: FoldPhase; staggered: boolean } = {
  phase: 'still',
  staggered: true,
}

const STEP_MS = 26

const LAST_STEP = 9

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

export function foldPanel(motion: FoldMotion | undefined): string {
  if (motion === undefined) {
    return ''
  }

  if (motion.phase === 'opening') {
    return '[clip-path:inset(-14px_-14px_-14px_-14px)] starting:[clip-path:inset(-14px_-14px_-14px_100%)] transition-[clip-path] duration-300 ease-fold motion-reduce:transition-none'
  }

  if (motion.phase === 'closing') {
    return '[clip-path:inset(-14px_-14px_-14px_100%)] transition-[clip-path] duration-300 ease-fold motion-reduce:transition-none'
  }

  // clip-path cannot interpolate out of `none`, so at rest it is still an inset.
  return '[clip-path:inset(-14px_-14px_-14px_-14px)]'
}

export function foldRail(folded: boolean): string {
  return folded ? '[--live-rail:44px]' : '[--live-rail:344px]'
}

export function foldColumn(motion: FoldMotion | undefined): string {
  if (motion === undefined || motion.phase === 'still') {
    return 'w-(--live-rail)'
  }

  return 'w-(--live-rail) transition-[width] duration-300 ease-fold motion-reduce:transition-none'
}

const PICTURE_HOLDS_STILL =
  'min-[1181px]:ml-0 min-[1181px]:flex-none min-[1181px]:w-[min(100%_-_var(--live-gap)_-_var(--live-rail),var(--pl-cap))]'

export function foldPicture(motion: FoldMotion | undefined): string {
  if (motion === undefined || motion.phase === 'still') {
    return PICTURE_HOLDS_STILL
  }

  return `${PICTURE_HOLDS_STILL} transition-[width] duration-300 ease-fold motion-reduce:transition-none`
}

export function foldPart(motion: FoldMotion | undefined): string {
  if (motion === undefined || motion.phase === 'still') {
    return 'translate-x-0 opacity-100'
  }

  if (motion.phase === 'opening') {
    return 'translate-x-0 opacity-100 starting:translate-x-[22px] starting:opacity-0 transition-[translate,opacity] duration-300 ease-toy motion-reduce:transition-none'
  }

  return 'translate-x-[14px] opacity-0 transition-[translate,opacity] duration-170 ease-fold motion-reduce:transition-none'
}

export function foldPartDelay(
  index: number,
  motion: FoldMotion | undefined,
): string | undefined {
  if (motion === undefined || motion.phase === 'still' || !motion.staggered) {
    return undefined
  }

  const step = Math.min(index, LAST_STEP)

  return `${(motion.phase === 'closing' ? LAST_STEP - step : step) * STEP_MS}ms`
}
