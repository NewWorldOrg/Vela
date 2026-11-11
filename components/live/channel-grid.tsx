'use client'

import { useCallback, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  arrivesIn,
  columnsAcross,
  delayOf,
  gridDelayMs,
  joinsIn,
  seatIn,
} from '@/lib/arrival'
import { useArrived } from '@/hooks/useArrived'
import { useNewcomers } from '@/hooks/useNewcomers'
import type { LiveChannel } from '@/repository/live'
import { ChannelCard } from '@/components/live/channel-card'

export function ChannelGrid({
  channels,
  onSelect,
  className,
}: {
  channels: LiveChannel[]
  onSelect: (channel: LiveChannel) => void
  className?: string
}) {
  const [columns, setColumns] = useState<number>(0)
  const arrived = useArrived()
  const newcomers = useNewcomers(channels.map((channel) => channel.id))
  const joining = channels
    .map((channel) => channel.id)
    .filter((id) => newcomers.has(id))

  const measure = useCallback(
    (node: HTMLUListElement | null) => {
      arrived.ref(node)

      if (node === null) {
        return
      }

      setColumns((was) => (was === 0 ? columnsAcross(node) : was))
    },
    [arrived],
  )

  return (
    <ul
      ref={measure}
      data-slot="channel-grid"
      className={cn(
        'grid w-full grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-x-4 gap-y-3.5',
        className,
      )}
    >
      {channels.map((channel, nth) => {
        const seat = seatIn(nth, columns)

        return (
          <li
            key={channel.id}
            style={delayOf(gridDelayMs(seat.row, seat.column))}
            className={cn(
              newcomers.has(channel.id)
                ? joinsIn(joining.indexOf(channel.id))
                : arrivesIn(nth),
              'swells min-w-0 max-w-[22rem]',
            )}
          >
            <ChannelCard channel={channel} onSelect={onSelect} />
          </li>
        )
      })}
    </ul>
  )
}
