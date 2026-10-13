'use client'

import { useRef, type Ref } from 'react'

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

/** The head of the column while the data broadcast is open: `リモコン` and `チャンネル` to switch between, and the fold. It slides in from the right when it first stands, and out with the fold. */
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
    <div
      data-slot="column-switch"
      style={{ marginBottom: UNDER_THE_HEAD }}
      className="flex items-start justify-end gap-1.5"
    >
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
      <FoldButton folded={folded} onFold={onFold} controls={controls} />
    </div>
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
