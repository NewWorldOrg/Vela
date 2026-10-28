'use client'

import { startTransition, useEffect, useState } from 'react'

import { useCameWithTheHtml } from '@/hooks/useCameWithTheHtml'

export function useFilledSoon(): boolean {
  const cameWithTheHtml = useCameWithTheHtml()
  const [filled, setFilled] = useState(cameWithTheHtml)

  useEffect(() => {
    if (!filled) {
      startTransition(() => setFilled(true))
    }
  }, [filled])

  return filled
}
