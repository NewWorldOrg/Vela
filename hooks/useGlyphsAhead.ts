'use client'

import { useEffect } from 'react'

import { ARRIVAL_SPAN_MS, GUIDE_FACES } from '@/lib/arrival'

export function useGlyphsAhead(glyphs: string): void {
  useEffect(() => {
    if (glyphs === '' || typeof document.fonts?.load !== 'function') {
      return
    }

    const timer = setTimeout(() => {
      for (const face of GUIDE_FACES) {
        document.fonts.load(face, glyphs).catch(() => undefined)
      }
    }, ARRIVAL_SPAN_MS)

    return () => clearTimeout(timer)
  }, [glyphs])
}
