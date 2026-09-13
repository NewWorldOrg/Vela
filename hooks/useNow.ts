'use client'

import { useEffect, useState } from 'react'

import { untilTheNextTick } from '@/lib/clock'

export type StopTicking = () => void

export interface TickingClock {
  now: () => number
  after: (run: () => void, ms: number) => StopTicking
}

export const browserTicks: TickingClock = {
  now: () => Date.now(),
  after: (run, ms) => {
    const timer = setTimeout(run, ms)

    return () => clearTimeout(timer)
  },
}

export function keepTicking(
  everyMs: number,
  tell: (at: Date) => void,
  clock: TickingClock,
): StopTicking {
  let waiting: StopTicking = () => {}

  const tick = () => {
    const at = clock.now()

    tell(new Date(at))
    waiting = clock.after(tick, untilTheNextTick(at, everyMs))
  }

  tick()

  return () => waiting()
}

export function useNow(everyMs: number, held?: Date): Date | undefined {
  const [now, setNow] = useState<Date>()

  useEffect(() => {
    if (held !== undefined) {
      return
    }

    return keepTicking(everyMs, setNow, browserTicks)
  }, [everyMs, held])

  return held ?? now
}
