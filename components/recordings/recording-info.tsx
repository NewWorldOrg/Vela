import Link from 'next/link'
import type { Route } from 'next'

import { genreOfLabel } from '@/repository/programs'
import { cn } from '@/lib/utils'
import { GenrePill } from '@/components/vela/genre-pill'
import { formatLength } from '@/lib/format'
import { reservationHref } from '@/lib/reservations'
import type {
  RecordingDetail,
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type { PlaybackRead } from '@/repository/videos'
import type { TicketWrite } from '@/repository/tickets'
import type { EncodeChoices, EncodeJob, EncodeWrite } from '@/repository/encode'
import { WarningIcon } from '@/components/vela/icons'
import { ChannelMark } from '@/components/vela/channel-mark'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { QualityChip } from '@/components/recordings/quality-chip'
import { EncodeChip } from '@/components/recordings/encode-chip'
import type { QueueEncode } from '@/components/recordings/encode-button'
import { RecordingActions } from '@/components/recordings/recording-actions'
import { RecordingRecord } from '@/components/recordings/recording-record'
import { OnAnUprightPhone } from '@/components/vela/on-an-upright-phone'

function Dot({ className }: { className?: string }) {
  return <span className={cn('text-ink-2', className)}>・</span>
}

/** How the recording's information is laid: in the page under the player, or in the face a phone held on its side opens at the picture's right, which is as narrow as an upright phone and lays it the same way. */
type InfoLaid = 'page' | 'face'

function Sep() {
  return (
    <i
      aria-hidden="true"
      className="size-[3px] shrink-0 rounded-full bg-ink-3 not-italic"
    />
  )
}

export function RecordingInfo({
  detail: d,
  playback,
  laid,
  onDelete,
  onRemakeThumbnail,
  onTakeTicket,
  onQueueEncode,
  encodeChoices,
  encodeJob,
  onCallOffEncode,
}: {
  detail: RecordingDetail
  playback: PlaybackRead
  laid: InfoLaid
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onRemakeThumbnail: (id: string) => Promise<ThumbnailWrite>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  onQueueEncode: QueueEncode
  encodeChoices: EncodeChoices
  encodeJob?: EncodeJob
  onCallOffEncode: (id: string) => Promise<EncodeWrite>
}) {
  const face = laid === 'face'
  const plan =
    !d.fileMissing &&
    playback.state === 'planned' &&
    playback.plan.route !== 'nothing'
      ? playback.plan
      : undefined
  const values = (
    <dl
      data-slot="phone-values"
      className={cn(
        'mt-3 grid-cols-3 overflow-hidden rounded-lg bg-surface-2',
        face ? 'order-1 grid' : 'hidden upright:order-1 upright:grid',
      )}
    >
      {[
        ['結果', <OutcomeChip key="outcome" recording={d} say />],
        ['品質', <QualityChip key="quality" recording={d} say />],
        ['エンコード', <EncodeChip key="encode" recording={d} say />],
      ].map(([name, value], nth) => (
        <div
          key={nth}
          className="min-w-0 border-l border-line px-3 py-[calc(9rem/16)] first:border-l-0"
        >
          <dt className="text-micro font-bold text-ink-2">{name}</dt>
          <dd className="truncate text-ui">{value}</dd>
        </div>
      ))}
    </dl>
  )
  const reservationLink = d.reservationId && (
    <Link
      href={reservationHref(d.reservationId) as Route}
      className="tap-target font-semibold text-ink underline-offset-[3px] hover:underline"
    >
      この録画の予約へ
    </Link>
  )
  const length =
    d.lengthSec != null && d.lengthSec > 0 ? (
      <span className="font-code">{formatLength(d.lengthSec)}</span>
    ) : null
  const failure = d.failureReason && (
    <div
      className={cn(
        'flex flex-wrap items-start gap-[calc(13rem/16)] rounded-lg px-[calc(15rem/16)] py-3',
        face
          ? 'order-4 mt-3.5 bg-surface-2'
          : 'mt-[calc(18rem/16)] max-w-[calc(900rem/16)] bg-surface upright:order-4',
      )}
    >
      <span className="flex size-8 flex-none items-center justify-center rounded-md bg-surface-2 text-ink-2">
        <WarningIcon className="size-[calc(17rem/16)]" />
      </span>
      <div className="min-w-[calc(170rem/16)] flex-1">
        <b className="heading block text-body">{d.failureReason.title}</b>
        {d.failureReason.body && (
          <p className="mt-0.5 text-sub leading-relaxed text-ink-2">
            {d.failureReason.body}
          </p>
        )}
        {d.failureReason.noticedAt && (
          <p className="mt-1 font-code text-note tabular-nums text-ink-2">
            {d.failureReason.noticedAt}
          </p>
        )}
      </div>
    </div>
  )
  const record = (
    <RecordingRecord
      className={
        face ? 'order-5 mt-3.5 rounded-lg bg-surface-2 px-4' : 'upright:order-5'
      }
      detail={d}
      plan={playback.state === 'planned' ? playback.plan : undefined}
      encodeJob={encodeJob}
      onCallOffEncode={onCallOffEncode}
    />
  )

  if (face) {
    return (
      <>
        <h2 className="heading text-section leading-[1.45]">{d.title}</h2>
        <div
          data-slot="watch-meta"
          className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sub text-ink-2 [&>a]:basis-full [&>span:first-child]:basis-full"
        >
          <span className="inline-flex items-center gap-2">
            <ChannelMark logo={d.channelLogo} no={d.channelNo} />
            <span>{d.channel}</span>
          </span>
          <span className="font-code">{d.recordedRange}</span>
          {length && (
            <>
              <Dot />
              {length}
            </>
          )}
          {reservationLink}
        </div>
        {d.genres && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {d.genres.map((g) => (
              <GenrePill key={g} genre={genreOfLabel(g)}>
                {g}
              </GenrePill>
            ))}
          </div>
        )}
        {values}
        {d.synopsis && (
          <p className="order-3 mt-3.5 text-body leading-[1.8] text-ink-2">
            {d.synopsis}
          </p>
        )}
        <div className="order-2 mt-3.5">
          <RecordingActions
            recording={d}
            onDelete={onDelete}
            onRemakeThumbnail={onRemakeThumbnail}
            onTakeTicket={onTakeTicket}
            onQueueEncode={onQueueEncode}
            encodeChoices={encodeChoices}
            laid="face"
          />
        </div>
        {failure}
        {record}
      </>
    )
  }

  return (
    <>
      <div
        data-slot="recording-info"
        className="flex min-w-0 flex-col upright:contents"
      >
        <h1 className="heading text-display-s [overflow-wrap:anywhere] upright:text-section upright:leading-[1.45]">
          {d.title}
        </h1>
        <div
          data-slot="watch-meta"
          className="-order-1 mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ui text-ink-2 upright:order-none upright:mt-1.5 upright:mb-0 upright:text-sub"
        >
          <span className="inline-flex items-center gap-2">
            <ChannelMark logo={d.channelLogo} no={d.channelNo} />
            <span>{d.channel}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-code">{d.recordedRange}</span>
          {reservationLink && (
            <>
              <span aria-hidden="true">·</span>
              {reservationLink}
            </>
          )}
        </div>
        {(length || d.genres) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-ui text-ink-2">
            {length}
            {length && d.genres && d.genres.length > 0 && <Sep />}
            {d.genres?.map((g) => (
              <GenrePill key={g} genre={genreOfLabel(g)}>
                {g}
              </GenrePill>
            ))}
          </div>
        )}
        <OnAnUprightPhone>{values}</OnAnUprightPhone>
        <div className="mt-[calc(18rem/16)] upright:order-2 upright:mt-3.5">
          <RecordingActions
            recording={d}
            onDelete={onDelete}
            onRemakeThumbnail={onRemakeThumbnail}
            onTakeTicket={onTakeTicket}
            onQueueEncode={onQueueEncode}
            encodeChoices={encodeChoices}
            plan={plan}
          />
        </div>
        {d.synopsis && (
          <p className="mt-3.5 max-w-[calc(640rem/16)] text-body leading-[calc(22rem/16)] text-ink-2 upright:order-3 upright:leading-[1.8]">
            {d.synopsis}
          </p>
        )}
      </div>
      {failure}
      {record}
    </>
  )
}
