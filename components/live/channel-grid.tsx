'use client'

import { useCallback, useState } from 'react'

import { cn } from '@/lib/utils'
import { columnsAcross, delayOf, gridDelayMs, seatIn } from '@/lib/arrival'
import { SPAN_DASH } from '@/lib/format'
import type { LiveChannel } from '@/repository/live'
import { ProgressBar } from '@/components/vela/progress'
import { Tile } from '@/components/vela/surface'
import { ChannelMark } from '@/components/vela/channel-mark'

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

  const measure = useCallback((node: HTMLUListElement | null) => {
    if (node === null) {
      return
    }

    setColumns((was) => (was === 0 ? columnsAcross(node) : was))
  }, [])

  return (
    <ul
      ref={measure}
      data-slot="channel-grid"
      className={cn(
        'mx-auto grid w-full max-w-[137rem] grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-x-4 gap-y-3.5',
        className,
      )}
    >
      {channels.map((channel, nth) => {
        const seat = seatIn(nth, columns)

        return (
          <li
            key={channel.id}
            style={delayOf(gridDelayMs(seat.row, seat.column))}
            className="arrives min-w-0 max-w-[22rem]"
          >
            <ChannelCard channel={channel} onSelect={onSelect} />
          </li>
        )
      })}
    </ul>
  )
}

function ChannelCard({
  channel,
  onSelect,
}: {
  channel: LiveChannel
  onSelect: (channel: LiveChannel) => void
}) {
  const programme = channel.now

  return (
    <Tile
      onClick={() => onSelect(channel)}
      className="relative flex size-full min-w-0 flex-none flex-col gap-1 overflow-hidden px-4 pt-3 pb-[15px]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <ChannelMark logo={channel.logo} no={channel.no} />
        <span className="min-w-0 flex-1 text-sub font-medium text-ink-2 [overflow-wrap:anywhere]">
          {channel.name}
        </span>
        {channel.viewers > 0 && (
          <span
            aria-label={`視聴者 ${channel.viewers}`}
            className="inline-flex shrink-0 items-center gap-1.5 font-code text-note text-coral"
          >
            <i
              aria-hidden="true"
              className="size-[7px] rounded-full bg-coral"
            />
            {channel.viewers}
          </span>
        )}
      </span>
      <span
        className={cn(
          'heading text-[16.5px] leading-[1.5] [overflow-wrap:anywhere]',
          !programme && 'font-normal text-ink-3',
        )}
      >
        {programme ? programme.title : '番組情報がありません'}
      </span>
      {programme && (
        <span className="font-code text-note tabular-nums text-ink-3">
          {programme.startLabel}
          {SPAN_DASH}
          {programme.endLabel ?? '終了未定'}
        </span>
      )}
      {channel.next && (
        <span className="mt-auto block pt-1 text-note text-ink-3 [overflow-wrap:anywhere]">
          次 <span className="font-code">{channel.next.startLabel}</span>{' '}
          {channel.next.title}
        </span>
      )}
      {programme && (
        <ProgressBar
          value={channel.progressPct ?? 0}
          label="番組の進行"
          className="absolute inset-x-0 bottom-0 h-1 rounded-none"
        />
      )}
    </Tile>
  )
}
