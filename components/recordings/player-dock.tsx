'use client'

import { createContext, type ReactNode, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { PLAYER_COLUMN } from '@/components/recordings/player-palette'

/** Where the dock opens: under the picture on a phone held upright, beside it on one held on its side. */
export type DockSide = 'under' | 'right'

/** What a screen keeps at the picture's right on a phone held on its side: the column of its buttons, and the faces those buttons open in the dock in the column's place. */
export interface SideColumn {
  /** The column's buttons; a `StripFaceButton` among them opens one of the faces. */
  strip: ReactNode
  /** What each of the screen's faces holds, by the name its head says. */
  faces: Readonly<Record<string, ReactNode>>
}

export const OpensAFace = createContext<(name: string) => void>(() => {})

/** The dock: the one place on a phone where the gear, the caption's face and the data broadcast open, attached to the picture and pushing what follows rather than lying over it. One thing at a time is in it; it is empty and hidden otherwise. */
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
