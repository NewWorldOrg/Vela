'use client'

import { cn } from '@/lib/utils'
import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KINDS } from '@/repository/channels'
import { pressable } from '@/components/vela/tactile'

/**
 * Which broadcast the channels shown are on.
 *
 * It sits at the top of whatever is showing the channels — above the grid
 * while one is being chosen, above the list while one is being watched — and
 * is the same control in both, because it is the same question. A television
 * answers it with its own keys on the remote and has nothing on screen for it,
 * so there is no set's arrangement to copy; the shape here is the one the web
 * clients of this kind of system arrived at (KonomiTV and EPGStation both put
 * tabs at the top of the channel list).
 */
export function ChannelKinds({
  kind,
  onKind,
  className,
}: {
  kind: ChannelKind
  onKind: (kind: ChannelKind) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="放送の種別"
      className={cn('flex min-w-0 flex-wrap gap-1.5', className)}
    >
      {CHANNEL_KINDS.map((one) => (
        <button
          key={one.value}
          type="button"
          aria-pressed={one.value === kind}
          onClick={() => onKind(one.value)}
          className={cn(
            'tap-target rounded-full border border-edge bg-transparent px-[15px] py-[5px] text-ui font-medium whitespace-nowrap text-ink-2 outline-none',
            'transition-[background-color,color,translate] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px focus-visible:shadow-ring',
            one.value === kind &&
              'border-brand bg-brand-soft font-bold text-brand',
            pressable,
          )}
        >
          {one.label}
        </button>
      ))}
    </div>
  )
}
