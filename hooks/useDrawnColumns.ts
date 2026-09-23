'use client'

import { type RefObject, useEffect, useState } from 'react'

import {
  type ColumnRange,
  columnsBeforeMeasuringOf,
  drawnColumnsOf,
} from '@/lib/guide'

export function useDrawnColumns(
  scroller: RefObject<HTMLElement | null>,
  columns: number,
): ColumnRange {
  const [range, setRange] = useState(() => columnsBeforeMeasuringOf(columns))

  useEffect(() => {
    const node = scroller.current

    if (node === null) {
      return
    }

    let frame: number | null = null

    const measure = (): void => {
      frame = null

      const next = drawnColumnsOf(node, columns)

      setRange((was) =>
        was.from === next.from && was.to === next.to ? was : next,
      )
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
  }, [scroller, columns])

  return range
}
