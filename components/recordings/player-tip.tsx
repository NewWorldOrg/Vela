'use client'

import type { ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PLAYER_PALETTE } from '@/components/recordings/player-palette'

const PLAYER_TIP_WAITS = 500

export function PlayerTip({
  name,
  keys,
  container,
  children,
}: {
  name: string
  keys?: readonly string[]
  container?: HTMLElement | null
  children: ReactNode
}) {
  return (
    <TooltipProvider delayDuration={PLAYER_TIP_WAITS} disableHoverableContent>
      <Tooltip>
        <TooltipTrigger asChild>
          <span data-slot="player-tip" className="inline-flex shrink-0">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          data-slot="player-tip-name"
          aria-label={name}
          container={container ?? undefined}
          collisionBoundary={container ?? undefined}
          side="top"
          style={PLAYER_PALETTE}
          className="pointer-events-none flex items-center gap-2 border-white/20 bg-(--pl-bg) px-2.5 py-1.5 font-medium text-(--pl-ink)"
        >
          {name}
          {keys?.map((key) => (
            <kbd
              key={key}
              className="inline-block rounded border border-white/20 px-1 font-code text-[11px] leading-normal font-normal text-(--pl-ink-3)"
            >
              {key}
            </kbd>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
