'use client'

import { useEffect, useRef, useState } from 'react'

import { PLAYER_BUTTON } from '@/lib/player-palette'
import { Setting } from '@/components/recordings/setting'

export type GearPanel = 'main' | 'captions'

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

export function gearWidth(panel: GearPanel): string {
  return panel === 'captions'
    ? 'max-w-[min(24rem,calc(100vw-1rem))]'
    : 'max-w-[min(20rem,calc(100vw-1rem))]'
}

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
