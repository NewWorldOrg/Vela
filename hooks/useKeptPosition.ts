'use client'

import { useEffect, useRef } from 'react'

import {
  browserTicks,
  type StopTicking,
  type TickingClock,
} from '@/hooks/useNow'
import { hasMovedOn, KEPT_EVERY_MS, wholeSecond } from '@/lib/playback-resume'

export interface PositionKeeping {
  reading: () => number
  sent: { at?: number }
  keep: (positionSec: number) => void
}

export function keepPositionWhilePlaying(
  everyMs: number,
  keeping: PositionKeeping,
  clock: TickingClock,
): StopTicking {
  const send = () => {
    const at = wholeSecond(keeping.reading())

    if (!hasMovedOn(keeping.sent.at, at)) {
      return
    }

    keeping.sent.at = at
    keeping.keep(at)
  }

  let waiting: StopTicking = () => {}

  const tick = () => {
    send()
    waiting = clock.after(tick, everyMs)
  }

  waiting = clock.after(tick, everyMs)

  return () => {
    waiting()
    send()
  }
}

export function useKeptPosition(
  playing: boolean,
  reading: () => number,
  keep: (positionSec: number) => void,
): void {
  const latest = useRef({ reading, keep })
  const sent = useRef<{ at?: number }>({})

  useEffect(() => {
    latest.current = { reading, keep }
  })

  useEffect(() => {
    if (!playing) {
      return
    }

    return keepPositionWhilePlaying(
      KEPT_EVERY_MS,
      {
        reading: () => latest.current.reading(),
        sent: sent.current,
        keep: (at) => latest.current.keep(at),
      },
      browserTicks,
    )
  }, [playing])
}
