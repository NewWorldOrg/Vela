'use client'

import { useEffect, useRef, useState } from 'react'

import { PLAYER_BUTTON } from '@/components/recordings/player-palette'
import { Setting } from '@/components/recordings/player-setting'

/** Which face of the gear is open: its own rows, or the caption's. */
export type GearPanel = 'main' | 'captions'

/** The gear's open state and which face is open: it opens on its own rows, the caption's row leads to the caption's face, and back returns to the row it left from. A gear taken away while open (the bar laid out anew across 600px) says it has closed, so the player does not go on holding its bar up for it. */
export function useGearPanel(
  onOpenChange?: (open: boolean) => void,
  held?: boolean,
) {
  const [own, setOpen] = useState(false)
  const open = held ?? own
  const [panel, setPanel] = useState<GearPanel>('main')
  const [returning, setReturning] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)

  if (wasOpen !== open) {
    setWasOpen(open)

    if (!open) {
      setPanel('main')
      setReturning(false)
    }
  }
  const opened = useRef(false)
  const tell = useRef(onOpenChange)

  useEffect(() => {
    tell.current = onOpenChange
  }, [onOpenChange])

  useEffect(
    () => () => {
      if (opened.current) {
        tell.current?.(false)
      }
    },
    [],
  )

  useEffect(() => {
    opened.current = open
  }, [open])

  return {
    open,
    panel,
    returning,
    change: (next: boolean) => {
      opened.current = next
      setOpen(next)
      setPanel('main')
      setReturning(false)
      onOpenChange?.(next)
    },
    toCaptions: () => setPanel('captions'),
    back: () => {
      setPanel('main')
      setReturning(true)
    },
  }
}

/** The gear's widest at either face: the caption's face takes more, so its row of backgrounds stands beside its name. */
export function gearWidth(panel: GearPanel): string {
  return panel === 'captions'
    ? 'max-w-[min(24rem,calc(100vw-1rem))]'
    : 'max-w-[min(20rem,calc(100vw-1rem))]'
}

/** The gear's row that leads to the caption's face. */
export function CaptionStyleEntry({
  onOpen,
  returning,
}: {
  onOpen: () => void
  returning: boolean
}) {
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (returning) {
      button.current?.focus()
    }
  }, [returning])

  return (
    <Setting label="字幕">
      <button
        ref={button}
        type="button"
        aria-label="字幕を変更"
        onClick={onOpen}
        className={PLAYER_BUTTON}
      >
        変更
      </button>
    </Setting>
  )
}
