'use client'

import { createContext, type ReactNode, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { PLAYER_COLUMN } from '@/lib/player-palette'

export type DockSide = 'under' | 'right'

export interface SideColumn {
  strip: ReactNode
  faces: Readonly<Record<string, ReactNode>>
}

export const OpensAFace = createContext<(name: string) => void>(() => {})

export function PlayerDock({
  side,
  open,
  ref,
}: {
  side: DockSide
  open: boolean
  ref: Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      data-slot="player-dock"
      data-side={side}
      hidden={!open}
      className={cn(
        'overflow-hidden rounded-xl border border-line-strong bg-(--pl-bg) text-(--pl-ink) shadow-pop-xl',
        side === 'under'
          ? cn(PLAYER_COLUMN, 'mt-2')
          : 'ml-3 w-[calc(300rem/16+env(safe-area-inset-right))] shrink-0 self-stretch overflow-y-auto overscroll-contain rounded-none border-0 border-l border-white/8 pr-[env(safe-area-inset-right)] pb-(--safe-bottom) shadow-none',
      )}
    />
  )
}
