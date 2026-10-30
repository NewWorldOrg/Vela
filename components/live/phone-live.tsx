'use client'

import { useState, useTransition, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { SPAN_DASH } from '@/lib/format'
import { minutesLeft } from '@/lib/live-clock'
import type { ChannelKind } from '@/repository/channels'
import type { LiveChannel, LiveWatching } from '@/repository/live'
import type { ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { ProgressBar, Spinner } from '@/components/vela/progress'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ChevronDownIcon, ChevronUpIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'
import { pressable } from '@/components/vela/tactile'
import { ChannelKinds } from '@/components/live/channel-kinds'
import {
  ProgramDescription,
  ProgramExtended,
} from '@/components/guide/program-description'

/** The kinds of channel across the phone's width, under the picture while one is watched. */
export function PhoneKinds({
  kind,
  kinds,
  onKind,
  className,
}: {
  kind: ChannelKind
  kinds: ChannelKind[]
  onKind: (kind: ChannelKind) => void
  className?: string
}) {
  return (
    <div
      data-slot="phone-kinds"
      className={cn('bg-bg px-4 py-2.5 empty:hidden', className)}
    >
      <ChannelKinds
        kind={kind}
        kinds={kinds}
        onKind={onKind}
        className="w-full [&>*]:flex-1"
      />
    </div>
  )
}

const ROW =
  'flex w-full items-center gap-3 py-3 pr-3.5 pl-4 text-left outline-none transition-[background-color] duration-150 ease-out hover:bg-surface-2 focus-visible:shadow-ring'

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
      className="border-y border-line bg-surface sideways:grid sideways:grid-cols-2"
    >
      {channels.map((channel) => {
        const programme = channel.now

        return (
          <li
            key={channel.id}
            className="border-b border-dashed border-line last:border-b-0 sideways:odd:border-r sideways:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
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
                  <span className="font-code text-micro text-ink-3">
                    {channel.no}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-note text-ink-3">
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
                    !programme && 'font-normal text-ink-3',
                  )}
                >
                  {programme ? programme.title : '番組情報がありません'}
                </span>
                {programme && (
                  <span className="mt-1 flex items-center gap-2 font-code text-micro text-ink-3">
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

function Watching() {
  return (
    <span className="flex shrink-0 items-center gap-[calc(5rem/16)] text-micro font-bold whitespace-nowrap text-brand">
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        <i className="h-1.5 w-[3px] bg-brand" />
        <i className="h-3 w-[3px] bg-brand" />
        <i className="h-2 w-[3px] bg-brand" />
      </span>
      視聴中
    </span>
  )
}

function Preparing() {
  return (
    <span className="flex shrink-0 items-center gap-[calc(5rem/16)] text-micro font-bold whitespace-nowrap text-brand">
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
      className="border-y border-line bg-surface"
    >
      {channels.map((channel) => {
        const on = channel.id === watchingId
        const left = minutesLeft(channel.now?.endsAt, at)

        return (
          <li
            key={channel.id}
            className="border-b border-dashed border-line last:border-b-0"
          >
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(channel)}
              className={cn(
                ROW,
                'relative min-h-[calc(62rem/16)] py-2.5',
                on &&
                  'bg-brand-soft before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand hover:bg-brand-soft',
                pressable,
              )}
            >
              <ChannelMark
                logo={channel.logo}
                no={channel.no}
                on={on}
                keepsTheSlot
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-ui leading-normal font-bold',
                    on && 'text-brand',
                    !channel.now && 'font-normal text-ink-3',
                  )}
                >
                  {channel.now ? channel.now.title : '番組情報がありません'}
                </span>
                <span className="flex items-center gap-1.5 text-note text-ink-3">
                  <span className="truncate">{channel.name}</span>
                  {left !== undefined && (
                    <>
                      <i
                        aria-hidden="true"
                        className="size-[3px] shrink-0 rounded-full bg-ink-3 opacity-70"
                      />
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

/** Reserves the programme on now in one press, and puts up a toast whose press takes the reservation back. */
export function RecordThisButton({
  programmeId,
  onReserve,
  onCancel,
}: {
  programmeId: string
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (reservationId: string) => Promise<ReservationWrite>
}) {
  const say = useToast()
  const [pending, start] = useTransition()

  const record = () =>
    start(async () => {
      const written = await onReserve(programmeId)

      if (written.state !== 'ok') {
        say({
          text:
            written.state === 'rejected'
              ? written.message
              : 'サインインし直してください',
        })

        return
      }

      const made = written.reservationId

      say({
        text: '録画予約しました',
        action: made
          ? {
              label: '取り消す',
              onPress: () => {
                void onCancel(made)
              },
            }
          : undefined,
      })
    })

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={record}
      className="h-[calc(38rem/16)]"
    >
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full bg-coral"
      />
      この番組を録画
    </Button>
  )
}

/** The programme on now, under the picture on a phone held upright: its title, its progress and what is left of it, the way out to another player and the reservation; its description unfolds under the chevron. */
export function PhoneLiveInfo({
  watching,
  external,
  record,
}: {
  watching: LiveWatching
  external: ReactNode
  record?: ReactNode
}) {
  const [unfolded, unfold] = useState(false)
  const { channel, progressPct, restMin } = watching
  const programme = channel.now
  const describes =
    programme !== undefined &&
    (programme.description !== undefined || programme.items !== undefined)

  return (
    <section
      data-slot="phone-live-info"
      className="border-b border-line bg-surface px-4 pt-3 pb-3.5"
    >
      <div className="flex items-start gap-2">
        <h1 className="heading min-w-0 flex-1 text-h2 leading-[1.45]">
          {programme ? programme.title : '番組情報がありません'}
        </h1>
        {describes && (
          <button
            type="button"
            aria-expanded={unfolded}
            aria-label="番組の詳細"
            onClick={() => unfold(!unfolded)}
            className={cn(
              '-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 outline-none focus-visible:shadow-ring [&_svg]:size-5',
              pressable,
            )}
          >
            {unfolded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        )}
      </div>
      {programme && (
        <div className="mt-1.5 flex items-center gap-2 font-code text-note text-ink-3">
          {programme.startLabel}
          <ProgressBar
            value={progressPct}
            label="番組の進行"
            className="min-w-[calc(60rem/16)] flex-1"
          />
          {programme.endLabel ?? '終了未定'}
          {restMin !== undefined && (
            <span className="font-body whitespace-nowrap">
              残り <span className="font-code">{restMin}</span> 分
            </span>
          )}
        </div>
      )}
      {unfolded && programme && (
        <div className="mt-3 border-t border-dashed border-line pt-3 [&>:last-child]:mb-0">
          <p className="mb-2 font-code text-note text-ink-3">
            {channel.name} {programme.startLabel}
            {SPAN_DASH}
            {programme.endLabel ?? '終了未定'}
          </p>
          {programme.description && (
            <ProgramDescription description={programme.description} />
          )}
          {programme.items?.map((item, index) => (
            <ProgramExtended key={index} item={item} />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {external}
        {record}
      </div>
    </section>
  )
}
