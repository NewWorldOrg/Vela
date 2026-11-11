'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'
import { CloseIcon } from '@/components/vela/icons'
import { PlayerTip } from '@/components/recordings/player-tip'
import {
  PLAYER_BUTTON,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'
import {
  SKIP_ONLY,
  skipNameInTheRow,
  skipWordsInTheRow,
} from '@/lib/player-chapters'
import type { SkippableKind } from '@/repository/videos'

function nothingToFollow(): () => void {
  return () => undefined
}

function fitsOnTheServer(): boolean {
  return true
}

/** Whether the skip with the given words stands on the line of the row it sits in, between what comes before it and what comes after it. */
function fitsBeside(seat: HTMLElement | null, unseen: HTMLElement | null) {
  const row = seat?.parentElement

  if (!seat || !row || !unseen) {
    return true
  }

  const line = row.getBoundingClientRect()
  const before = seat.previousElementSibling?.getBoundingClientRect().right
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0
  let after = 0

  for (
    let next = seat.nextElementSibling;
    next;
    next = next.nextElementSibling
  ) {
    after += next.getBoundingClientRect().width + gap
  }

  const room =
    (before === undefined ? line.width : line.right - before - gap) - after

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

      for (const one of [
        row,
        seat.previousElementSibling,
        seat.nextElementSibling,
        unseen,
      ]) {
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
 * The skip button and its close button in the line of the time, before the full screen, where the bar takes a phone's
 * layout; words that do not fit there give way to the shortest ones.
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
        aria-label={skipNameInTheRow(kinds, fits)}
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
