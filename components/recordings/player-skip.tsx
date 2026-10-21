'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'
import { CloseIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import { PlayerTip } from '@/components/recordings/player-tip'
import {
  PLAYER_BUTTON,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'
import { SKIP_ONLY, skipWords, skipWordsInTheRow } from '@/lib/player-chapters'
import type { SkippableKind } from '@/repository/videos'

export const SKIP_THE: Record<SkippableKind, string> = {
  break: skipWords(['break']),
  opening: skipWords(['opening']),
  ending: skipWords(['ending']),
}

const ON_THE_PICTURE =
  'tap-target flex items-center justify-center rounded-full border border-white/25 bg-black/80 text-(--pl-ink) transition-[translate,background-color,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:bg-black/90 hover:text-white active:translate-x-px active:translate-y-px focus-visible:shadow-ring focus-visible:outline-none still:transition-none'

export function PlayerSkip({
  kinds,
  to,
  raised,
  onSkip,
  onDismiss,
  container,
}: {
  kinds: readonly SkippableKind[]
  to: number
  raised: boolean
  onSkip: (to: number) => void
  onDismiss: () => void
  container: HTMLElement | null
}) {
  return (
    <div
      data-slot="player-skip"
      data-raised={raised ? 'true' : undefined}
      className={cn(
        'absolute right-4 bottom-5 z-20 flex items-center gap-2 appears [--from-y:8px] max-[700px]:right-3',
        'transition-[translate] duration-100 ease-[cubic-bezier(.4,0,1,1)] data-[raised]:-translate-y-[calc(96rem/16)] data-[raised]:duration-[250ms] data-[raised]:ease-[cubic-bezier(0,0,.2,1)] still:transition-none',
      )}
    >
      <button
        type="button"
        onClick={() => onSkip(to)}
        className={cn(
          ON_THE_PICTURE,
          'px-[calc(18rem/16)] py-2 text-ui font-bold whitespace-nowrap',
          pressable,
        )}
      >
        {skipWords(kinds)}
      </button>
      <PlayerTip name="閉じる" container={container}>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onDismiss}
          className={cn(ON_THE_PICTURE, 'size-9 [&_svg]:size-4', pressable)}
        >
          <CloseIcon />
        </button>
      </PlayerTip>
    </div>
  )
}

function nothingToFollow(): () => void {
  return () => undefined
}

function fitsOnTheServer(): boolean {
  return true
}

/** Whether the skip with the given words stands beside what comes before it on the line of the row it sits in. */
function fitsBeside(seat: HTMLElement | null, unseen: HTMLElement | null) {
  const row = seat?.parentElement

  if (!seat || !row || !unseen) {
    return true
  }

  const line = row.getBoundingClientRect()
  const before = seat.previousElementSibling?.getBoundingClientRect().right
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0
  const room = before === undefined ? line.width : line.right - before - gap

  return unseen.getBoundingClientRect().width <= room
}

function useFitsBeside(
  seat: HTMLElement | null,
  unseen: HTMLElement | null,
): boolean {
  const follow = useCallback(
    (notify: () => void) => {
      const row = seat?.parentElement

      if (!row) {
        return nothingToFollow()
      }

      const resizing = new ResizeObserver(notify)

      for (const one of [row, seat.previousElementSibling, unseen]) {
        if (one) {
          resizing.observe(one)
        }
      }

      return () => resizing.disconnect()
    },
    [seat, unseen],
  )

  return useSyncExternalStore(
    follow,
    () => fitsBeside(seat, unseen),
    fitsOnTheServer,
  )
}

const SKIP_IN_THE_ROW = 'flex items-center gap-x-1'

/**
 * The skip button and its close button at the right end of the last line of the control row, where the row folds over a
 * narrow picture; words that do not fit there give way to the shortest ones.
 */
export function PlayerSkipInTheRow({
  kinds,
  to,
  onSkip,
  onDismiss,
  container,
}: {
  kinds: readonly SkippableKind[]
  to: number
  onSkip: (to: number) => void
  onDismiss: () => void
  container: HTMLElement | null
}) {
  const [seat, setSeat] = useState<HTMLDivElement | null>(null)
  const [unseen, setUnseen] = useState<HTMLSpanElement | null>(null)
  const words = skipWordsInTheRow(kinds)
  const fits = useFitsBeside(seat, unseen)

  return (
    <div
      ref={setSeat}
      data-slot="player-skip"
      data-place="row"
      className={cn('relative ml-auto', SKIP_IN_THE_ROW)}
    >
      <button
        type="button"
        onClick={() => onSkip(to)}
        className={PLAYER_BUTTON}
      >
        {fits ? words : SKIP_ONLY}
      </button>
      <PlayerTip name="閉じる" container={container}>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onDismiss}
          className={PLAYER_GLYPH_BUTTON}
        >
          <CloseIcon />
        </button>
      </PlayerTip>
      <span
        ref={setUnseen}
        aria-hidden="true"
        className={cn(
          SKIP_IN_THE_ROW,
          'pointer-events-none invisible absolute',
        )}
      >
        <span className={PLAYER_BUTTON}>{words}</span>
        <span className="size-10 shrink-0" />
      </span>
    </div>
  )
}
