'use client'

import { useRef, type MouseEvent, type ReactNode } from 'react'

import { pressMeansOf, type PressMeans } from '@/lib/player-taps'

export interface Press {
  means: PressMeans
  /** Whether the controls were showing when the press came down. */
  wasUp: boolean
}

function coarseScreen(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  )
}

/** The surface over the picture that takes presses, telling each player whether a finger or a mouse pressed it. */
export function PlayerPress({
  up,
  closesSettings,
  onAim,
  onPress,
  onDoubleClick,
  children,
}: {
  up: boolean
  closesSettings: boolean
  onAim: () => void
  onPress: (event: MouseEvent<HTMLDivElement>, press: Press) => void
  onDoubleClick?: (event: MouseEvent<HTMLDivElement>) => void
  children?: ReactNode
}) {
  const dismissing = useRef(false)
  const pressed = useRef<Press | null>(null)

  return (
    <div
      data-slot="player-press"
      onPointerDown={(event) => {
        pressed.current = {
          means: pressMeansOf(event.pointerType, coarseScreen()),
          wasUp: up,
        }
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        dismissing.current = closesSettings
        onAim()
      }}
      onClick={(event) => {
        const press = pressed.current ?? {
          means: pressMeansOf(undefined, coarseScreen()),
          wasUp: up,
        }

        pressed.current = null

        if (dismissing.current) {
          dismissing.current = false

          return
        }

        onPress(event, press)
      }}
      onDoubleClick={onDoubleClick}
      data-up={up ? 'true' : undefined}
      className="absolute inset-0 cursor-none touch-manipulation select-none data-[up]:cursor-pointer"
    >
      {children}
    </div>
  )
}
