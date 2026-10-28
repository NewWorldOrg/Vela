'use client'

import {
  type RefObject,
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  type ColumnRange,
  type MinuteRange,
  columnsBeforeMeasuringOf,
  drawnColumnsOf,
  grownColumnsOf,
  holdsEveryColumn,
  joinedColumnsOf,
  minutesInViewOf,
} from '@/lib/guide'
import { useCameWithTheHtml } from '@/hooks/useCameWithTheHtml'

export interface DrawnRange {
  columns: ColumnRange
  minutes: MinuteRange
}

const IDLE_WAIT_MS = 500

/** No minute of the day: the server's HTML carries the guide's frame and empty columns. Once the browser has measured the guide, the cells in view are drawn, and the rest of the day when the browser is next idle or the guide is scrolled. */
const NOTHING_YET = { from: 0, to: 0 }

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
    settled,
    day,
  }: {
    columns: number
    windowMin: number
    filled: boolean
    settled: boolean
    day: string
  },
): DrawnRange {
  const cameWithTheHtml = useCameWithTheHtml()
  const [range, setRange] = useState<DrawnRange>(() => ({
    columns: columnsBeforeMeasuringOf(columns),
    minutes: cameWithTheHtml ? NOTHING_YET : { from: 0, to: windowMin },
  }))
  const wholeDayDrawn = useRef(!cameWithTheHtml)

  useEffect(() => {
    const node = scroller.current

    if (node === null || !filled) {
      return
    }

    const wholeDay = { from: 0, to: windowMin }
    let minutes = wholeDayDrawn.current
      ? wholeDay
      : minutesInViewOf(node, windowMin)
    let built: ColumnRange | null = null
    let frame: number | null = null
    let stopGrowing: (() => void) | null = null
    let stopWidening: (() => void) | null = null

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

    const widen = (): void => {
      stopWidening?.()
      stopWidening = null

      if (wholeDayDrawn.current) {
        return
      }

      wholeDayDrawn.current = true
      minutes = wholeDay
      soon()
    }

    const scrolled = (): void => {
      widen()
      soon()
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
    if (settled) {
      stopGrowing = whenIdle(grow)
    }

    node.addEventListener('scroll', scrolled, { passive: true })
    resizing.observe(node)
    soon()

    if (!wholeDayDrawn.current) {
      stopWidening = whenIdle(widen)
    }

    return () => {
      node.removeEventListener('scroll', scrolled)
      resizing.disconnect()
      stopGrowing?.()
      stopWidening?.()

      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
    }
  }, [scroller, columns, windowMin, filled, settled, day])

  return range
}
