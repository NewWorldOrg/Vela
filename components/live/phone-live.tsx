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

function Watching() {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-note font-semibold whitespace-nowrap text-ink-2">
      <i
        aria-hidden="true"
        className="size-1.5 rounded-full bg-accent not-italic"
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

/** Reserves a programme in one press, and puts up a toast whose press takes the reservation back. */
export function useRecordInOnePress(
  onReserve: (programmeId: string) => Promise<ReservationWrite>,
  onCancel: (reservationId: string) => Promise<ReservationWrite>,
): [boolean, (programmeId: string) => void] {
  const say = useToast()
  const [pending, start] = useTransition()

  const record = (programmeId: string) =>
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

  return [pending, record]
}

/** The reservation's ring: the accent's outline, as the guide draws a programme reserved in one press. */
export function ReserveRing({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-3.5 shrink-0 rounded-full border-2 border-accent',
        className,
      )}
    />
  )
}

/** Reserves the programme on now in one press, and puts up a toast whose press takes the reservation back. */
export function RecordThisButton({
  programmeId,
  onReserve,
  onCancel,
  size = 'sm',
}: {
  programmeId: string
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (reservationId: string) => Promise<ReservationWrite>
  /** Under the picture of a phone, or in the column beside the programme on a wide window. */
  size?: 'sm' | 'lg'
}) {
  const [pending, record] = useRecordInOnePress(onReserve, onCancel)

  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() => record(programmeId)}
      className={size === 'sm' ? 'h-[calc(38rem/16)]' : undefined}
    >
      <ReserveRing />
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
    <section data-slot="phone-live-info" className="px-4 pt-3 pb-3.5">
      <p className="mb-1 flex items-center gap-1.5 text-note text-ink-2">
        <ChannelMark logo={channel.logo} no={channel.no} />
        {channel.name}
      </p>
      <div className="flex items-start gap-2">
        <h1 className="heading min-w-0 flex-1 text-section leading-[1.45]">
          {programme ? programme.title : '番組情報がありません'}
        </h1>
        {describes && (
          <button
            type="button"
            aria-expanded={unfolded}
            aria-label="番組の詳細"
            onClick={() => unfold(!unfolded)}
            className={cn(
              '-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none focus-visible:shadow-ring [&_svg]:size-5',
              pressable,
            )}
          >
            {unfolded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        )}
      </div>
      {programme && (
        <div className="mt-1.5 flex items-center gap-2 font-code text-note text-ink-2">
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
          <p className="mb-2 font-code text-note text-ink-2">
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
