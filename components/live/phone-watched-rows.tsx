'use client'

import { cn } from '@/lib/utils'
import { minutesLeft } from '@/lib/live-clock'
import type { LiveChannel } from '@/repository/live'
import { Spinner } from '@/components/vela/spinner'
import { ChannelMark } from '@/components/vela/channel-mark'
import { pressable } from '@/components/vela/tactile'
import { ROW } from '@/components/live/phone-channel-rows'

function Watching() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-note font-semibold whitespace-nowrap text-ink-2">
      <i
        aria-hidden="true"
        className="size-1.5 rounded-full bg-rec not-italic"
      />
      視聴中
    </span>
  )
}

function Preparing() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-note font-semibold whitespace-nowrap text-ink-2">
      <Spinner size="control" />
      準備中
    </span>
  )
}

/** The channels while one is watched: a row each under the picture, the programme on now, the channel and the minutes it has left. The one watched is in the accent's soft ground with a line at its left; the one being made ready says so. Pressing another switches to it without closing the picture. */
export function PhoneWatchedRows({
  channels,
  watchingId,
  preparing,
  at,
  onSelect,
}: {
  channels: LiveChannel[]
  watchingId?: string
  preparing: boolean
  at?: Date
  onSelect: (channel: LiveChannel) => void
}) {
  return (
    <ul
      data-slot="phone-watched-rows"
      className="flex flex-col gap-0.5 px-2 pb-2"
    >
      {channels.map((channel) => {
        const on = channel.id === watchingId
        const left = minutesLeft(channel.now?.endsAt, at)

        return (
          <li key={channel.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(channel)}
              className={cn(
                ROW,
                'relative min-h-[calc(62rem/16)] rounded-md py-2.5 pl-2.5',
                on && 'bg-surface hover:bg-surface',
                pressable,
              )}
            >
              <ChannelMark
                logo={channel.logo}
                no={channel.no}
                shape="square"
                keepsTheSlot
                className="size-10 rounded-md text-title"
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-title leading-normal font-semibold',
                    !channel.now && 'font-normal text-ink-2',
                  )}
                >
                  {channel.now ? channel.now.title : '番組情報がありません'}
                </span>
                <span className="flex items-center gap-1.5 text-note text-ink-2">
                  <span className="truncate">{channel.name}</span>
                  {left !== undefined && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">
                        残り <span className="font-code">{left}</span> 分
                      </span>
                    </>
                  )}
                </span>
              </span>
              {on && (preparing ? <Preparing /> : <Watching />)}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
