'use client'

import { type RefObject, useEffect, useState } from 'react'

import {
  type ColumnRange,
  type MinuteRange,
  columnsBeforeMeasuringOf,
  drawnColumnsOf,
  drawnMinutesOf,
  minutesBeforeMeasuringOf,
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
    nowMin,
  }: {
    columns: number
    windowMin: number
    hourPx: number
    nowMin: number | undefined
  },
): DrawnRange {
  const [range, setRange] = useState<DrawnRange>(() => ({
    columns: columnsBeforeMeasuringOf(columns),
    minutes: minutesBeforeMeasuringOf(nowMin, windowMin, hourPx),
  }))

  useEffect(() => {
    const node = scroller.current

    if (node === null) {
      return
    }

    let frame: number | null = null

    const measure = (): void => {
      frame = null

      const across = drawnColumnsOf(node, columns)
      const down = drawnMinutesOf(node, windowMin, hourPx)

      setRange((was) => {
        const minutes = down ?? was.minutes

        return sameRange(was.columns, across) && sameRange(was.minutes, minutes)
          ? was
          : { columns: across, minutes }
      })
    }

    const soon = (): void => {
      if (frame === null) {
        frame = requestAnimationFrame(measure)
      }
    }

    const resizing = new ResizeObserver(soon)

    node.addEventListener('scroll', soon, { passive: true })
    resizing.observe(node)
    soon()

    return () => {
      node.removeEventListener('scroll', soon)
      resizing.disconnect()

      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
    }
  }, [scroller, columns, windowMin, hourPx])

  return range
}
