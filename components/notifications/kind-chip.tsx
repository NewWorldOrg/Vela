'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { KIND_LABEL, type DestinationKind } from '@/lib/notifications'
import { shapeFor, wordFor } from '@/lib/not-yet-in-this-build'
import { Badge } from '@/components/ui/badge'

/** Each kind of destination wears a tint of its own, borrowed from tints that say no verdict, so that none reads as a state. */
const KIND_TINT: Record<DestinationKind, string> = {
  slack: 'bg-g-music-deep text-g-music-text',
  discord: 'bg-g-anime-deep text-g-anime-text',
  webPush: 'bg-g-info-deep text-g-info-text',
}

const UNKNOWN_KIND = 'bg-surface-2 text-ink-2'

export function KindChip({
  kind,
  className,
}: {
  kind: DestinationKind
  className?: string
}): ReactNode {
  return (
    <Badge
      data-kind={kind}
      className={cn(shapeFor(KIND_TINT, kind, UNKNOWN_KIND), className)}
    >
      {wordFor(KIND_LABEL, kind)}
    </Badge>
  )
}
