'use client'

import { cn } from '@/lib/utils'
import type { LiveChannel } from '@/repository/live'
import { ProgressBar } from '@/components/vela/progress'
import { Tile } from '@/components/vela/surface'
import { ChannelKey } from '@/components/live/channel-list'

/**
 * The channels, as cards laid out across the screen — the whole of what the
 * live screen is before one of them is chosen.
 *
 * The screen used to be the shape of watching before there was anything to
 * watch: an empty 16:9 panel taking seven tenths of the width with nothing
 * under it, and the channels in a 344px column beside it. Choosing is what
 * that screen is for, so the channels are what it is made of.
 *
 * What goes on a card was measured against the products that draw this screen
 * for a living. Commercial live television mostly does not have this screen at
 * all — Plex and Hulu open on a grid of hours, YouTube TV on a list of
 * networks, TVer and ABEMA straight into a picture — and the products that do
 * have it are the ones that face the same aerial this does: KonomiTV lays out
 * `auto-fit` cards of 365px rising to 445px on a wide screen, Chinachu four
 * dense ones. Both put the station on one line and the programme in the line
 * under it, and neither has a picture on the card.
 *
 * What is on the card, and why each one and not another:
 *
 * - **The station**, with the remote-control key it answers to. One line, and
 *   the smaller of the two, because a channel is chosen far more often by what
 *   is on it than by whose it is
 * - **What is on now**, the largest thing on the card. KonomiTV draws the
 *   station bigger and the programme bolder; here the programme takes both,
 *   which is what was asked for and what the card is for
 * - **The hours it runs**, spelled as the two clock times. Every product
 *   measured spells them that way and not one of them counts the minutes left
 * - **What follows it**, on one line. KonomiTV keeps a `NEXT` block; the list
 *   this replaces already had the line, and it is what says whether a channel
 *   is worth going to in ten minutes
 * - **How far in the programme is**, as a bar along the bottom edge. KonomiTV,
 *   Chinachu and EPGStation all draw one. It is a value and not a decoration:
 *   it is the one thing on the card the clock changes
 *
 * What was left off: the genre, which only one of the products carries; the
 * minutes remaining, which none of them do; and any description, which the
 * screen does not take (v3.21).
 */
export function ChannelGrid({
  channels,
  onSelect,
  className,
}: {
  channels: LiveChannel[]
  onSelect: (channel: LiveChannel) => void
  className?: string
}) {
  return (
    <ul
      data-slot="channel-grid"
      className={cn(
        'grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-4 gap-y-3.5',
        className,
      )}
    >
      {channels.map((channel) => (
        <li key={channel.id} className="min-w-0">
          <ChannelCard channel={channel} onSelect={onSelect} />
        </li>
      ))}
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
        {channel.no && <ChannelKey no={channel.no} />}
        <span className="min-w-0 flex-1 truncate text-sub font-medium text-ink-2">
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
          'heading line-clamp-2 text-[16.5px] leading-[1.5]',
          !programme && 'font-normal text-ink-3',
        )}
      >
        {programme ? programme.title : '番組情報がありません'}
      </span>
      {programme && (
        <span className="font-code text-note tabular-nums text-ink-3">
          {programme.startLabel}–{programme.endLabel ?? '終了未定'}
        </span>
      )}
      {channel.next && (
        <span className="mt-auto block truncate pt-1 text-note text-ink-3">
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
