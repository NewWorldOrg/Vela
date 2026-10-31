'use client'

import type { ReactNode } from 'react'

import type { LiveWatching } from '@/repository/live'
import type { ReservationWrite } from '@/repository/reservations'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { saysSubtitled } from '@/lib/program-title'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ProgressBar } from '@/components/vela/progress'
import { pressable } from '@/components/vela/tactile'
import {
  ProgramDescription,
  ProgramExtended,
} from '@/components/guide/program-description'
import { ReserveRing, useRecordInOnePress } from '@/components/live/phone-live'

function Dot() {
  return (
    <i
      aria-hidden="true"
      className="size-[3px] shrink-0 rounded-full bg-ink-3 not-italic"
    />
  )
}

/** The ring after what comes next: one press reserves it, and the toast takes it back. */
function ReserveNext({
  programmeId,
  title,
  onReserve,
  onCancel,
}: {
  programmeId: string
  title: string
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (reservationId: string) => Promise<ReservationWrite>
}) {
  const [pending, record] = useRecordInOnePress(onReserve, onCancel)

  return (
    <button
      type="button"
      aria-label={`${title}を予約`}
      disabled={pending}
      onClick={() => record(programmeId)}
      className={cn(
        'tap-target -my-2 flex size-8 shrink-0 items-center justify-center rounded-full outline-none hover:bg-surface focus-visible:shadow-ring disabled:opacity-40',
        pressable,
      )}
    >
      <ReserveRing className="size-3" />
    </button>
  )
}

/** The programme on now under the picture: the station's mark, the channel, the title, its hours and facts, what comes next, and its description; the column at its right holds what can be done with it. */
export function NowNext({
  watching,
  actions,
  onReserve,
  onCancel,
  className,
}: {
  watching: LiveWatching
  actions?: ReactNode
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
  onCancel?: (reservationId: string) => Promise<ReservationWrite>
  className?: string
}) {
  const { channel, progressPct, restMin } = watching
  const programme = channel.now
  const next = channel.next

  const subtitled =
    programme !== undefined &&
    programme.hasSubtitles &&
    !saysSubtitled(programme.title)

  return (
    <section
      data-slot="now-next"
      className={cn(
        'mt-[calc(22rem/16)] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 max-[900px]:grid-cols-1',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-[calc(18rem/16)]">
        <ChannelMark logo={channel.logo} no={channel.no} shape="square" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-ui text-ink-2">
            {channel.no && <span className="font-code">{channel.no}</span>}
            {channel.name}
          </p>
          <h1 className="heading mt-1.5 text-display-s [overflow-wrap:anywhere]">
            {programme ? programme.title : '番組情報がありません'}
          </h1>
          {programme && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-ui text-ink-2">
              <span className="flex items-center gap-2 font-code whitespace-nowrap">
                {programme.startLabel}
                <ProgressBar
                  value={progressPct}
                  label="番組の進行"
                  className="w-[calc(96rem/16)]"
                />
                {programme.endLabel ?? '終了未定'}
              </span>
              {restMin !== undefined && (
                <>
                  <Dot />
                  <span className="font-code whitespace-nowrap">
                    残り {restMin} 分
                  </span>
                </>
              )}
              {(subtitled || programme.genreLabel) && <Dot />}
              {subtitled && <Badge variant="ok">字幕あり</Badge>}
              {programme.genreLabel && (
                <Badge variant="ok">{programme.genreLabel}</Badge>
              )}
            </div>
          )}
          {next && (
            <div
              data-slot="live-next"
              className="mt-5 flex max-w-[calc(640rem/16)] items-center gap-3 border-t border-hair pt-4"
            >
              <span className="text-note font-semibold text-ink-2">次</span>
              <span className="font-code text-ui text-ink-2">
                {next.startLabel}
              </span>
              <span className="min-w-0 truncate text-body font-semibold">
                {next.title}
              </span>
              {onReserve && onCancel && (
                <ReserveNext
                  programmeId={next.id}
                  title={next.title}
                  onReserve={onReserve}
                  onCancel={onCancel}
                />
              )}
            </div>
          )}
          {programme && (programme.description || programme.items) && (
            <div className="mt-4 max-w-[calc(640rem/16)] text-body text-ink-2 [&>:last-child]:mb-0">
              {programme.description && (
                <ProgramDescription description={programme.description} />
              )}
              {programme.items?.map((item, index) => (
                <ProgramExtended key={index} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-col items-stretch gap-2.5 pt-1 min-[901px]:w-[calc(236rem/16)] max-[900px]:flex-row max-[900px]:flex-wrap">
          {actions}
        </div>
      )}
    </section>
  )
}
