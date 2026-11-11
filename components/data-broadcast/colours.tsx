'use client'

import type { BmlKey } from '@/lib/bml/keys'
import { cn } from '@/lib/utils'
import { pressable } from '@/components/vela/tactile'
import {
  type Pressing,
  aiming,
} from '@/components/data-broadcast/data-broadcast-player'

const COLOURS: { key: BmlKey; name: string; fill: string }[] = [
  { key: 'blue', name: '青', fill: 'bg-(--remote-blue)' },
  { key: 'red', name: '赤', fill: 'bg-(--remote-red)' },
  { key: 'green', name: '緑', fill: 'bg-(--remote-green)' },
  { key: 'yellow', name: '黄', fill: 'bg-(--remote-yellow)' },
]

/** The four colour keys as the remote has them: a dot of the colour and nothing written on it. The press reaches halfway to the neighbour. */
export function Colours({ pressing }: { pressing: Pressing }) {
  return (
    <div className="flex h-(--dot) shrink-0 items-center gap-[calc(var(--pitch)-var(--dot))]">
      {COLOURS.map((colour) => (
        <button
          key={colour.key}
          type="button"
          aria-label={colour.name}
          onMouseDown={aiming(pressing)}
          onClick={() => pressing.onKey(colour.key)}
          className={cn(
            'relative flex size-(--dot) shrink-0 items-center justify-center select-none after:absolute after:inset-y-0 after:-inset-x-[calc((var(--pitch)-var(--dot))/2)] after:content-[""] focus-visible:outline-none focus-visible:[&_i]:shadow-ring active:[&_i]:translate-x-px active:[&_i]:translate-y-px',
            pressable,
          )}
        >
          <i
            className={cn(
              'block size-(--dot) rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)] transition-[translate] duration-150 ease-toy',
              colour.fill,
            )}
          />
        </button>
      ))}
    </div>
  )
}
