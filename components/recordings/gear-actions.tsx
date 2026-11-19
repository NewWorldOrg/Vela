'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  PLAYER_BUTTON,
  PLAYER_BUTTON_ON,
} from '@/components/recordings/player-palette'

export type GearAction = {
  name: string
  icon: ReactNode
  disabled?: boolean
  pressed?: boolean
  onPress: () => void
}

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
      className="flex flex-wrap items-center gap-2 border-b border-dashed border-white/12 py-3.5 last:border-b-0 [[data-side=right]_&]:flex-col [[data-side=right]_&]:items-stretch"
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
            '[[data-side=right]_&]:h-11 [[data-side=right]_&]:justify-center',
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
