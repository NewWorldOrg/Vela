'use client'

import { FOLD_STEP_MS, type FoldMotion } from '@/lib/live-fold'

export function stepOf(nth: 0 | 1, motion: FoldMotion): string | undefined {
  if (motion.phase === 'still' || !motion.staggered) {
    return undefined
  }

  const step = motion.phase === 'opening' ? nth : 1 - nth

  return `${step * FOLD_STEP_MS}ms`
}

export const PLAYER_SIDE_COLUMN =
  'sticky top-[calc(var(--top-bar)+16rem/16)] flex max-h-[calc(100svh-var(--top-bar)-56rem/16-env(safe-area-inset-bottom))] shrink-0 flex-col items-end overflow-clip [overflow-clip-margin:14px]'

export const COLUMN_BODY =
  'flex min-h-0 w-full flex-col min-[1181px]:w-[calc(372rem/16)]'
