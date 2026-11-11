'use client'

import { cn } from '@/lib/utils'
import type { Said } from '@/components/recordings/handing-over'

const SAID_INK: Record<'page' | 'player', Record<Said['tone'], string>> = {
  page: { done: 'text-ink-2', failed: 'text-coral' },
  player: { done: 'text-(--pl-ink-2)', failed: 'text-(--pl-err)' },
}

export function WhatHappened({
  said,
  tone,
}: {
  said: Said | null
  tone: 'page' | 'player'
}) {
  if (!said) {
    return null
  }

  return (
    <p role="status" className={cn('text-cap', SAID_INK[tone][said.tone])}>
      {said.text}
    </p>
  )
}
