'use client'

import { cn } from '@/lib/utils'
import type { LiveChannel } from '@/repository/live'
import { ProgressBar } from '@/components/vela/progress-bar'
import { ChannelMark } from '@/components/vela/channel-mark'
import { pressable } from '@/components/vela/tactile'

export const ROW =
  'flex w-full items-center gap-3 py-3 pr-3.5 pl-4 text-left outline-none transition-[background-color] duration-150 ease-out hover:bg-surface focus-visible:shadow-ring'

/** The channels before one is chosen: a row each across the phone's width, the station's mark and number, the programme on now with its start, end and progress, and what comes next. Pressing a row watches it. */
export function PhoneChannelRows({
  channels,
  onSelect,
}: {
  channels: LiveChannel[]
  onSelect: (channel: LiveChannel) => void
}) {
  return (
    <ul
      data-slot="phone-channel-rows"
      className="sideways:grid sideways:grid-cols-2"
    >
      {channels.map((channel) => {
        const programme = channel.now

        return (
          <li
            key={channel.id}
            className="border-b border-hair last:border-b-0 sideways:odd:border-r sideways:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
          >
            <button
              type="button"
              onClick={() => onSelect(channel)}
              className={cn(ROW, 'min-h-[calc(92rem/16)]', pressable)}
            >
              <span className="flex w-12 shrink-0 flex-col items-center gap-1">
                <ChannelMark
                  logo={channel.logo}
                  no={channel.logo ? undefined : channel.no}
                  keepsTheSlot
                />
                {channel.logo && channel.no && (
                  <span className="font-code text-micro text-ink-2">
                    {channel.no}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-note text-ink-2">
                  <span className="shrink-0">{channel.name}</span>
                  {channel.next && (
                    <span className="ml-auto min-w-0 truncate text-right">
                      次{' '}
                      <span className="font-code">
                        {channel.next.startLabel}
                      </span>{' '}
                      {channel.next.title}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'block truncate text-title leading-normal font-bold',
                    !programme && 'font-normal text-ink-2',
                  )}
                >
                  {programme ? programme.title : '番組情報がありません'}
                </span>
                {programme && (
                  <span className="mt-1 flex items-center gap-2 font-code text-micro text-ink-2">
                    {programme.startLabel}
                    <ProgressBar
                      value={channel.progressPct ?? 0}
                      label="番組の進行"
                      className="flex-1"
                    />
                    {programme.endLabel ?? '終了未定'}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
