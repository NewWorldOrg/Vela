'use client'

import { cn } from '@/lib/utils'
import { SPAN_DASH } from '@/lib/format'
import type { LiveChannel } from '@/repository/live'
import { ProgressBar } from '@/components/vela/progress-bar'
import { Tile } from '@/components/vela/tile'
import { ChannelMark } from '@/components/vela/channel-mark'

export function ChannelCard({
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
      className="relative flex size-full min-w-0 flex-none flex-col gap-1 overflow-hidden px-4 pt-3 pb-[calc(15rem/16)]"
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
              className="size-[calc(7rem/16)] rounded-full bg-coral"
            />
            {channel.viewers}
          </span>
        )}
      </span>
      <span
        className={cn(
          'heading text-[calc(16.5rem/16)] leading-[1.5] [overflow-wrap:anywhere]',
          !programme && 'font-normal text-ink-2',
        )}
      >
        {programme ? programme.title : '番組情報がありません'}
      </span>
      {programme && (
        <span className="font-code text-note tabular-nums text-ink-2">
          {programme.startLabel}
          {SPAN_DASH}
          {programme.endLabel ?? '終了未定'}
        </span>
      )}
      {channel.next && (
        <span className="mt-auto block pt-1 text-note text-ink-2 [overflow-wrap:anywhere]">
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
