'use client'

import { useEffect, useRef } from 'react'

import { halfWidthOf } from '@/lib/guide-cell'
import { cn } from '@/lib/utils'
import type { Channel } from '@/repository/channels'
import { ChannelMark } from '@/components/vela/channel-mark'

/** Every channel of the guide in one row a thumb slides along, the ones on the screen picked out. */
export function ChannelStrip({
  channels,
  shown,
  onPick,
  className,
}: {
  channels: Channel[]
  shown: ReadonlySet<string>
  onPick: (channel: Channel, nth: number) => void
  className?: string
}) {
  const strip = useRef<HTMLDivElement | null>(null)
  const first = channels.findIndex((c) => shown.has(c.id))

  useEffect(() => {
    const node = strip.current
    const chip = node?.children[first] as HTMLElement | undefined

    if (!node || !chip) {
      return
    }

    const left = chip.offsetLeft - node.offsetLeft
    const right = left + chip.offsetWidth

    if (left < node.scrollLeft || right > node.scrollLeft + node.clientWidth) {
      node.scrollTo({ left: Math.max(0, left - 14) })
    }
  }, [first])

  return (
    <div
      ref={strip}
      role="group"
      aria-label="チャンネル"
      className={cn(
        'flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {channels.map((c, nth) => {
        const on = shown.has(c.id)

        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(c, nth)}
            className={cn(
              'flex h-11 max-w-[calc(150rem/16)] shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface pr-3.5 pl-1.5 text-sub font-medium text-ink-2',
              on && 'border-brand bg-brand-soft font-bold text-brand',
            )}
          >
            <ChannelMark logo={c.logo} no={c.no} on={on} />
            <span className="min-w-0 truncate">{halfWidthOf(c.name)}</span>
          </button>
        )
      })}
    </div>
  )
}
