'use client'

import { FOLD_STEP_MS, type FoldMotion } from '@/lib/live-fold'

/** The head and the remote move one step apart, as two bands of the fold: the head first in, the remote first out. */
export function stepOf(nth: 0 | 1, motion: FoldMotion): string | undefined {
  if (motion.phase === 'still' || !motion.staggered) {
    return undefined
  }

  const step = motion.phase === 'opening' ? nth : 1 - nth

  return `${step * FOLD_STEP_MS}ms`
}

/** The column beside the player: pinned under the top bar, no taller than the window lets it stand, its bands clipped at its sides with room kept for rings and shadows. */
export const PLAYER_SIDE_COLUMN =
  'sticky top-[calc(var(--top-bar)+16rem/16)] flex max-h-[calc(100svh-var(--top-bar)-56rem/16-env(safe-area-inset-bottom))] shrink-0 flex-col items-end overflow-clip [overflow-clip-margin:14px]'

/** What the column holds while the data broadcast is open, at the column's open width however narrow the column is drawn, so a fold slides it rather than lays it out again. */
export const COLUMN_BODY =
  'flex min-h-0 w-full flex-col min-[1181px]:w-[calc(372rem/16)]'
