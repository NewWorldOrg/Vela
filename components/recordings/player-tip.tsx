'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const PLAYER_TIP_WAITS = 500

let keyedLast = false
let listening = false

function listenForTheHand(): void {
  if (listening) {
    return
  }

  listening = true
  document.addEventListener('keydown', () => (keyedLast = true), true)
  document.addEventListener('pointerdown', () => (keyedLast = false), true)
}

export function PlayerTip({
  name,
  keys,
  container,
  quiet = false,
  children,
}: {
  name: string
  keys?: readonly string[]
  container?: HTMLElement | null
  quiet?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pointerOn = useRef(false)
  const held = useRef<HTMLSpanElement>(null)

  useEffect(listenForTheHand, [])

  useEffect(() => {
    const pressedElsewhere = (event: PointerEvent): void => {
      if (!held.current?.contains(event.target as Node)) {
        pointerOn.current = false
      }
    }

    document.addEventListener('pointerdown', pressedElsewhere, true)

    return () =>
      document.removeEventListener('pointerdown', pressedElsewhere, true)
  }, [])

  if (quiet && open) {
    setOpen(false)
  }

  const change = (next: boolean): void => {
    setOpen(next && !quiet && (pointerOn.current || keyedLast))
  }

  return (
    <TooltipProvider delayDuration={PLAYER_TIP_WAITS} disableHoverableContent>
      <Tooltip open={open} onOpenChange={change}>
        <TooltipTrigger asChild>
          <span
            ref={held}
            data-slot="player-tip"
            className="inline-flex shrink-0"
            onPointerEnter={() => (pointerOn.current = true)}
            onPointerLeave={() => (pointerOn.current = false)}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          data-slot="player-tip-name"
          aria-label={name}
          container={container ?? undefined}
          collisionBoundary={container ?? undefined}
          side="top"
          className="pointer-events-none flex items-center gap-2 border-white/20 bg-(--pl-bg) px-2.5 py-1.5 font-medium text-(--pl-ink)"
        >
          {name}
          {keys?.map((key) => (
            <kbd
              key={key}
              className="inline-block rounded border border-white/20 px-1 font-code text-cap leading-normal font-normal text-(--pl-ink-3)"
            >
              {key}
            </kbd>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
