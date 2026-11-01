'use client'

import { useRef, type ReactNode, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { FOLD_STEP_MS, foldBand, type FoldMotion } from '@/lib/live-fold'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { FoldButton } from '@/components/live/channel-list'
import { useSettled } from '@/components/live/channel-fold'

/** What the column shows while the data broadcast is open: its remote, or the channels. */
export type ColumnShows = 'remote' | 'channels'

/** The head and the remote move one step apart, as two bands of the fold: the head first in, the remote first out. */
function stepOf(nth: 0 | 1, motion: FoldMotion): string | undefined {
  if (motion.phase === 'still' || !motion.staggered) {
    return undefined
  }

  const step = motion.phase === 'opening' ? nth : 1 - nth

  return `${step * FOLD_STEP_MS}ms`
}

const SHOWS = [
  { value: 'remote', label: 'リモコン' },
  { value: 'channels', label: 'チャンネル' },
]

/** The gap under the column's head, as the mock lays the remote under it. */
const UNDER_THE_HEAD = 14

/** The column beside the player: pinned under the top bar, no taller than the window lets it stand, its bands clipped at its sides with room kept for rings and shadows. */
export const PLAYER_SIDE_COLUMN =
  'sticky top-[calc(var(--top-bar)+16rem/16)] flex max-h-[calc(100svh-var(--top-bar)-56rem/16-env(safe-area-inset-bottom))] shrink-0 flex-col items-end overflow-clip [overflow-clip-margin:14px]'

/** What the column holds while the data broadcast is open, at the column's open width however narrow the column is drawn, so a fold slides it rather than lays it out again. */
export const COLUMN_BODY =
  'flex min-h-0 w-full flex-col min-[1181px]:w-[calc(344rem/16)]'

/** The head of the column while the data broadcast is open: what stands at its left, and the fold at its right end, with the remote 14 below. */
export function ColumnHead({
  folded,
  onFold,
  controls,
  foldLabel,
  children,
}: {
  folded: boolean
  onFold: (folded: boolean) => void
  controls?: string
  foldLabel?: string
  children?: ReactNode
}) {
  return (
    <div
      data-slot="column-head"
      style={{ marginBottom: UNDER_THE_HEAD }}
      className="flex items-start justify-end gap-1.5"
    >
      {children}
      <FoldButton
        folded={folded}
        onFold={onFold}
        controls={controls}
        label={foldLabel}
      />
    </div>
  )
}

/** The live column's head: `リモコン` and `チャンネル` to switch between, and the fold. The switch slides in from the right when it first stands, and out with the fold. */
export function ColumnSwitch({
  shows,
  onShows,
  folded,
  onFold,
  motion,
  controls,
}: {
  shows: ColumnShows
  onShows: (shows: ColumnShows) => void
  folded: boolean
  onFold: (folded: boolean) => void
  motion: FoldMotion
  controls?: string
}) {
  return (
    <ColumnHead folded={folded} onFold={onFold} controls={controls}>
      <div className="min-w-0 flex-1 overflow-clip [overflow-clip-margin:6px]">
        <div
          style={{ transitionDelay: stepOf(0, motion) }}
          className={foldBand(motion)}
        >
          <SegmentedControl
            aria-label="リモコンとチャンネル"
            options={SHOWS}
            value={shows}
            onValueChange={(next) =>
              onShows(next === 'channels' ? 'channels' : 'remote')
            }
          />
        </div>
      </div>
    </ColumnHead>
  )
}

/** Where the remote is drawn in the column, under the head: the remote stands at its own height at the top, and a window too short for it scrolls the column. It slides in from the right after the head, and out before it. */
export function RemoteSlot({
  id,
  motion,
  onLeft,
  slotRef,
}: {
  id: string
  motion: FoldMotion
  onLeft?: () => void
  slotRef: Ref<HTMLDivElement>
}) {
  const whole = useRef<HTMLDivElement>(null)

  useSettled(whole, onLeft ? motion.phase : 'still', onLeft)

  return (
    <div
      ref={whole}
      data-fold={motion.phase}
      className="-mr-1 min-h-0 overflow-x-hidden overflow-y-auto pr-1 pb-1 data-[fold=closing]:pointer-events-none"
    >
      <div
        id={id}
        ref={slotRef}
        data-slot="remote-slot"
        style={{ transitionDelay: stepOf(1, motion) }}
        className={cn('w-full', foldBand(motion))}
      />
    </div>
  )
}
