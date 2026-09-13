'use client'

import { useEffect, useRef } from 'react'

export type StopReading = () => void

export interface ReadingClock {
  now: () => number
  after: (run: () => void, ms: number) => StopReading
  every: (run: () => void, ms: number) => StopReading
  visible: () => boolean
  whenVisibilityChanges: (run: () => void) => StopReading
}

export const browserReading: ReadingClock = {
  now: () => Date.now(),
  after: (run, ms) => {
    const timer = setTimeout(run, ms)

    return () => clearTimeout(timer)
  },
  every: (run, ms) => {
    const timer = setInterval(run, ms)

    return () => clearInterval(timer)
  },
  visible: () => document.visibilityState === 'visible',
  whenVisibilityChanges: (run) => {
    document.addEventListener('visibilitychange', run)

    return () => document.removeEventListener('visibilitychange', run)
  },
}

export function keepReading(
  atMs: number | undefined,
  everyMs: number | undefined,
  read: () => void,
  clock: ReadingClock,
): StopReading {
  let readAt = clock.now()
  let owed = false
  let polling: StopReading | undefined

  const take = () => {
    readAt = clock.now()
    read()
  }

  const poll = () => {
    if (everyMs !== undefined && polling === undefined) {
      polling = clock.every(take, everyMs)
    }
  }

  const restPolling = () => {
    polling?.()
    polling = undefined
  }

  const waited = atMs === undefined ? -1 : atMs - clock.now()
  const mark =
    waited > 0
      ? clock.after(() => {
          if (clock.visible()) {
            take()
          } else {
            owed = true
          }
        }, waited)
      : undefined

  if (clock.visible()) {
    poll()
  }

  const watching = clock.whenVisibilityChanges(() => {
    if (!clock.visible()) {
      restPolling()

      return
    }

    const aPeriodHasPassed =
      everyMs !== undefined && clock.now() - readAt >= everyMs

    if (owed || aPeriodHasPassed) {
      owed = false
      take()
    }

    poll()
  })

  return () => {
    mark?.()
    restPolling()
    watching()
  }
}

export function useReadAgain(
  atMs: number | undefined,
  everyMs: number | undefined,
  read: () => void,
): void {
  const latest = useRef(read)

  useEffect(() => {
    latest.current = read
  })

  useEffect(() => {
    if (atMs === undefined && everyMs === undefined) {
      return
    }

    return keepReading(atMs, everyMs, () => latest.current(), browserReading)
  }, [atMs, everyMs])
}
