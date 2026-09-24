'use client'

import { type RefObject, startTransition, useEffect, useState } from 'react'

import { ARRIVAL_SPAN_MS } from '@/lib/arrival'
import {
  type ColumnRange,
  type MinuteRange,
  columnsBeforeMeasuringOf,
  drawnColumnsOf,
  drawnMinutesOf,
} from '@/lib/guide'

export interface DrawnRange {
  columns: ColumnRange
  minutes: MinuteRange
}

function sameRange(
  one: { from: number; to: number },
  other: { from: number; to: number },
): boolean {
  return one.from === other.from && one.to === other.to
}

export function useDrawnRange(
  scroller: RefObject<HTMLElement | null>,
  {
    columns,
    windowMin,
    hourPx,
    filled,
  }: {
    columns: number
    windowMin: number
    hourPx: number
    filled: boolean
  },
): DrawnRange {
  const [range, setRange] = useState<DrawnRange>(() => ({
    columns: columnsBeforeMeasuringOf(columns),
    minutes: { from: 0, to: windowMin },
  }))

  useEffect(() => {
    const node = scroller.current

    if (node === null || !filled) {
      return
    }

    let frame: number | null = null
    let arriving = true

    const measure = (): void => {
      frame = null

      const across = drawnColumnsOf(node, columns)
      const down = arriving
        ? { from: 0, to: windowMin }
        : drawnMinutesOf(node, windowMin, hourPx)

      const settle = (): void =>
        setRange((was) => {
          const minutes = down ?? was.minutes

          return sameRange(was.columns, across) &&
            sameRange(was.minutes, minutes)
            ? was
            : { columns: across, minutes }
        })

      startTransition(settle)
    }

    const soon = (): void => {
      if (frame === null) {
        frame = requestAnimationFrame(measure)
      }
    }

    const resizing = new ResizeObserver(soon)
    const arrived = setTimeout(() => {
      arriving = false
      soon()
    }, ARRIVAL_SPAN_MS)

    node.addEventListener('scroll', soon, { passive: true })
    resizing.observe(node)
    soon()

    return () => {
      node.removeEventListener('scroll', soon)
      resizing.disconnect()
      clearTimeout(arrived)

      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
    }
  }, [scroller, columns, windowMin, hourPx, filled])

  return range
}
