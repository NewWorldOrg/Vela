'use client'

import { useEffect, useState } from 'react'

import { untilTheNextTick } from '@/lib/clock'

export function useNow(everyMs: number, held?: Date): Date | undefined {
  const [now, setNow] = useState<Date>()

  useEffect(() => {
    if (held !== undefined) {
      return
    }

    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const at = new Date()

      setNow(at)
      timer = setTimeout(tick, untilTheNextTick(at.getTime(), everyMs))
    }

    tick()

    return () => clearTimeout(timer)
  }, [everyMs, held])

  return held ?? now
}
