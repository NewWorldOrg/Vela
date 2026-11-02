'use client'

import { useState } from 'react'

import { movesNow } from '@/lib/motion'
import { useCameWithTheHtml } from '@/hooks/useCameWithTheHtml'

export function useOpensWithAShow(): boolean {
  const cameWithTheHtml = useCameWithTheHtml()
  const [shows] = useState(
    () =>
      !cameWithTheHtml &&
      movesNow(
        document.documentElement.dataset.motion,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
  )

  return shows
}
