'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'
import { SettingsIcon } from '@/components/vela/icons'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  PLAYER_BUTTON,
  PLAYER_BUTTON_ON,
  PLAYER_GLYPH_BUTTON,
  PLAYER_GLYPH_BUTTON_ON,
} from '@/components/recordings/player-palette'
import { DockFace } from '@/components/recordings/player-dock'
import {
  gearWidth,
  type GearPanel,
} from '@/components/recordings/caption-style-controls'

const FACE = 'bg-(--pl-bg) text-(--pl-ink)'

/** The gear: a small window over the picture, drawn inside the board so it goes full screen with it; and on a phone, where the board is given a dock, the gear's face opens in the dock instead, attached to the picture as the caption's face and the data broadcast are. */
export function PlayerGear({
  container,
  dock = null,
  open,
  onOpenChange,
  panel,
  padding = 'p-4',
  children,
}: {
  container: HTMLElement | null
  dock?: HTMLElement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  panel: GearPanel
  padding?: string
  children: ReactNode
}) {
  const trigger = <SettingsIcon className="size-4" />

  if (dock) {
    return (
      <>
        <button
          type="button"
          aria-label="設定"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          className={cn(PLAYER_GLYPH_BUTTON, open && PLAYER_GLYPH_BUTTON_ON)}
        >
          {trigger}
        </button>
        {open &&
          createPortal(
            <DockFace name="設定" onClose={() => onOpenChange(false)}>
              {children}
            </DockFace>,
            dock,
          )}
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger aria-label="設定" className={PLAYER_GLYPH_BUTTON}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        container={container}
        aria-label="設定"
        side="top"
        align="end"
        sideOffset={10}
        updatePositionStrategy="always"
        className={cn(
          'w-auto min-w-[17rem] rounded-lg border-white/20 shadow-pop-xl',
          FACE,
          padding,
          gearWidth(panel),
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

/** One thing the gear does rather than chooses: taking a capture, sending the picture out to picture in picture. */
export type GearAction = {
  name: string
  icon: ReactNode
  disabled?: boolean
  pressed?: boolean
  onPress: () => void
}

/** The gear's last row, when the bar has no room for the controls it does not use often: each one by its own name, and pressing it closes the gear. */
export function GearActions({
  actions,
  onDone,
}: {
  actions: readonly GearAction[]
  onDone: () => void
}) {
  if (actions.length === 0) {
    return null
  }

  return (
    <div
      data-slot="gear-actions"
      className="flex flex-wrap items-center gap-2 border-b border-dashed border-white/12 py-3.5 last:border-b-0"
    >
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          disabled={action.disabled}
          aria-pressed={action.pressed}
          onClick={() => {
            onDone()
            action.onPress()
          }}
          className={cn(
            PLAYER_BUTTON,
            'inline-flex items-center gap-1.5 [&_svg]:size-4',
            action.pressed && PLAYER_BUTTON_ON,
          )}
        >
          {action.icon}
          {action.name}
        </button>
      ))}
    </div>
  )
}
