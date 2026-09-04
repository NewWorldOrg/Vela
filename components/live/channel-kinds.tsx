'use client'

import { cn } from '@/lib/utils'
import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KIND_ORDER, CHANNEL_KIND_TAB } from '@/repository/channels'
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
 *
 * Only the types that have a channel are offered. A type with nothing on it
 * reaches the same nothing from wherever it is pressed, and the canon has
 * already said that three tabs onto one face are three presses that change
 * nothing — this is that sentence with the channels in place of the tuners.
 * KonomiTV, the one measured product facing the same aerial, deletes the tab
 * of a type whose channels came back empty.
 *
 * Fewer than two of them and there is no bar at all: a single tab, already
 * pressed, is a press onto the face it is already on.
 */
export function ChannelKinds({
  kind,
  kinds,
  onKind,
  className,
}: {
  kind: ChannelKind
  /** The types that have a channel, in the order they are listed. */
  kinds: ChannelKind[]
  onKind: (kind: ChannelKind) => void
  className?: string
}) {
  const offered = CHANNEL_KIND_ORDER.filter((one) => kinds.includes(one))

  if (offered.length < 2) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="放送の種別"
      className={cn('flex min-w-0 flex-wrap gap-1.5', className)}
    >
      {offered.map((one) => (
        <button
          key={one}
          type="button"
          aria-pressed={one === kind}
          onClick={() => onKind(one)}
          className={cn(
            'tap-target rounded-full border border-edge bg-transparent px-[15px] py-[5px] text-ui font-medium whitespace-nowrap text-ink-2 outline-none',
            'transition-[background-color,color,translate] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px focus-visible:shadow-ring',
            one === kind && 'border-brand bg-brand-soft font-bold text-brand',
            pressable,
          )}
        >
          {CHANNEL_KIND_TAB[one]}
        </button>
      ))}
    </div>
  )
}
