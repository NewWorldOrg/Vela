'use client'

import type { ReactNode } from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'

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
} from '@/components/recordings/player-palette'
import {
  gearWidth,
  type GearPanel,
} from '@/components/recordings/caption-style-controls'

const FACE = 'bg-(--pl-bg) text-(--pl-ink)'

/** The gear: a small window over the picture where the board is wide enough, and a sheet from the foot of the window where it is not, so neither leaves the screen. The small window is drawn inside the board, and so is the sheet while the board is full screen; otherwise the sheet is drawn on the page, so nothing between it and the window holds it to a box of its own. */
export function PlayerGear({
  container,
  sheet,
  full = false,
  open,
  onOpenChange,
  panel,
  padding = 'p-4',
  children,
}: {
  container: HTMLElement | null
  sheet: boolean
  full?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  panel: GearPanel
  padding?: string
  children: ReactNode
}) {
  const trigger = <SettingsIcon className="size-4" />

  if (sheet) {
    return (
      <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <SheetPrimitive.Trigger
          aria-label="設定"
          className={PLAYER_GLYPH_BUTTON}
        >
          {trigger}
        </SheetPrimitive.Trigger>
        <SheetPrimitive.Portal container={full ? container : undefined}>
          <SheetPrimitive.Overlay
            data-slot="player-gear-scrim"
            className="fixed inset-0 z-[70] bg-black/45 data-[state=closed]:scrim-disappears data-[state=open]:scrim-appears"
          />
          <SheetPrimitive.Content
            data-slot="player-gear-sheet"
            aria-label="設定"
            aria-describedby={undefined}
            className={cn(
              'fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[min(75dvh,calc(100dvh-3rem))] w-full max-w-[calc(560rem/16)] overflow-y-auto overscroll-contain rounded-t-xl border border-b-0 border-white/20 px-4 pt-2 pb-[calc(1rem+var(--safe-bottom))] shadow-pop-xl outline-none [--from-y:12px] data-[state=closed]:disappears data-[state=open]:appears',
              FACE,
            )}
          >
            <SheetPrimitive.Title className="sr-only">
              設定
            </SheetPrimitive.Title>
            <span
              aria-hidden="true"
              className="mx-auto mb-2 block h-1 w-9 rounded-full bg-white/25"
            />
            {children}
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>
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
