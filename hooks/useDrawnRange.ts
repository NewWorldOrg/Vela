'use client'

import { type RefObject, startTransition, useEffect, useState } from 'react'

import { ARRIVAL_SPAN_MS } from '@/lib/arrival'
import {
  type ColumnRange,
  type MinuteRange,
  columnsBeforeMeasuringOf,
  drawnColumnsOf,
  grownColumnsOf,
  holdsEveryColumn,
  joinedColumnsOf,
} from '@/lib/guide'

export interface DrawnRange {
  columns: ColumnRange
  minutes: MinuteRange
}

const IDLE_WAIT_MS = 500

const BETWEEN_COLUMNS_MS = 100

function sameRange(
  one: { from: number; to: number },
  other: { from: number; to: number },
): boolean {
  return one.from === other.from && one.to === other.to
}

function whenIdle(run: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const asked = requestIdleCallback(run, { timeout: IDLE_WAIT_MS })

    return () => cancelIdleCallback(asked)
  }

  const timer = setTimeout(run, BETWEEN_COLUMNS_MS)

  return () => clearTimeout(timer)
}

export function useDrawnRange(
  scroller: RefObject<HTMLElement | null>,
  {
    columns,
    windowMin,
    filled,
    day,
  }: {
    columns: number
    windowMin: number
    filled: boolean
    day: string
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

    const minutes = { from: 0, to: windowMin }
    let built: ColumnRange | null = null
    let frame: number | null = null
    let stopGrowing: (() => void) | null = null

    const show = (next: ColumnRange): void => {
      built = next

      startTransition(() =>
        setRange((was) =>
          sameRange(was.columns, next) && sameRange(was.minutes, minutes)
            ? was
            : { columns: next, minutes },
        ),
      )
    }

    const measure = (): void => {
      frame = null

      const seen = drawnColumnsOf(node, columns)

      show(built === null ? seen : joinedColumnsOf(built, seen))
    }

    const soon = (): void => {
      if (frame === null) {
        frame = requestAnimationFrame(measure)
      }
    }

    const grow = (): void => {
      stopGrowing = null

      if (built === null || holdsEveryColumn(built, columns)) {
        return
      }

      show(grownColumnsOf(built, columns))
      stopGrowing = whenIdle(grow)
    }

    const resizing = new ResizeObserver(soon)
    const arrived = setTimeout(() => {
      stopGrowing = whenIdle(grow)
    }, ARRIVAL_SPAN_MS)

    node.addEventListener('scroll', soon, { passive: true })
    resizing.observe(node)
    soon()

    return () => {
      node.removeEventListener('scroll', soon)
      resizing.disconnect()
      clearTimeout(arrived)
      stopGrowing?.()

      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
    }
  }, [scroller, columns, windowMin, filled, day])

  return range
}
