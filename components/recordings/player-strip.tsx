'use client'

import { type ReactNode } from 'react'

import { OpensAFace } from '@/components/recordings/player-dock'

/** The column at the picture's right on a phone held on its side: the screen's buttons, as high as the window, on the player's ground. Kept while a face stands in its place, only hidden, so what it had scrolled to is still there when the face closes. */
export function PlayerStrip({
  hidden,
  onOpen,
  children,
}: {
  hidden: boolean
  onOpen: (name: string) => void
  children: ReactNode
}) {
  return (
    <div
      data-slot="player-strip"
      hidden={hidden}
      className="flex w-[calc(57rem/16+env(safe-area-inset-right))] shrink-0 flex-col items-center gap-1.5 self-stretch border-l border-white/6 bg-(--pl-bg) pt-2 pr-[env(safe-area-inset-right)] pb-[calc(var(--safe-bottom)+8rem/16)] text-(--pl-ink) [&[hidden]]:hidden"
    >
      <OpensAFace value={onOpen}>{children}</OpensAFace>
    </div>
  )
}
