'use client'

import { useEffect } from 'react'

export function useGlyphsAhead(
  loads: ReadonlyArray<readonly [string, string]>,
  started: boolean,
): void {
  useEffect(() => {
    if (
      !started ||
      loads.length === 0 ||
      typeof document.fonts?.load !== 'function'
    ) {
      return
    }

    for (const [face, glyphs] of loads) {
      document.fonts.load(face, glyphs).catch(() => undefined)
    }
  }, [loads, started])
}
