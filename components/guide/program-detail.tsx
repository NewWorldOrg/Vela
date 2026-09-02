import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'

import type { Channel } from '@/repository/channels'
import type {
  Program,
  ProgramItem,
  RelatedProgram,
  RelationKind,
} from '@/repository/programs'
import type { ReservationWrite } from '@/repository/reservations'
import { liveScreenHref } from '@/repository/live-paths'
import { mainTitleOf } from '@/lib/program-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ListIcon,
  LiveIcon,
  PersonIcon,
  RecordIcon,
  RelayIcon,
} from '@/components/vela/icons'
import { ReserveButton } from '@/components/guide/reserve-button'

const RELATION_WORDING: Record<
  RelationKind,
  { lead: (channel?: string) => string; link: string }
> = {
  relayed: {
    lead: (channel) =>
      channel
        ? `放送は ${channel} で継続されます。`
        : '放送は別のチャンネルで継続されます。',
    link: '継続先を見る',
  },
  moved: {
    lead: (channel) =>
      channel
        ? `放送枠が ${channel} に移動しています。`
        : '放送枠が移動しています。',
    link: '移動先を見る',
  },
  shared: {
    lead: (channel) =>
      channel
        ? `${channel} でも同時に放送されます。`
        : '別のチャンネルでも同時に放送されます。',
    link: '同時放送を見る',
  },
}

/**
 * Everything a programme is read for, below its name: the service it is on,
 * when it runs, what it says, the listings it is tied to, and the way to
 * reserve it.
 *
 * One part, drawn in both places a programme is read — the layer the guide
 * opens over itself, and the programme's own address. The name is left to the
 * caller because the two hold it differently: a dialog's title is the part
 * that does not scroll away, and a page's is its heading.
 *
 * `reservation` stands in for the reserve controls when a seat is already
 * held, which is a thing only the guide knows and only the guide can undo.
 *
 * `onAir` is the caller's reading of the clock against the programme. While
 * it holds, the way to the live screen is offered, with this channel chosen —
 * the same address a press on the live screen's own list would have made.
 */
export function ProgramDetailBody({
  program,
  channel,
  dayLabel,
  onAir = false,
  onReserve,
  reservation,
}: {
  program: Program
  channel?: Channel
  dayLabel: string
  onAir?: boolean
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  reservation?: ReactNode
}) {
  const related = program.related ?? []
  const items = program.items ?? []

  return (
    <div data-program-detail>
      <div className="mb-[9px] flex items-center gap-2.5">
        {channel?.no && (
          <span className="rounded-md border border-line bg-surface-2 px-2 py-px font-code text-[11px] font-medium text-ink-2">
            {channel.no}
          </span>
        )}
        {channel?.name && (
          <span className="text-ui text-ink-2">{channel.name}</span>
        )}
      </div>
      <p className="font-code text-[13.5px] tabular-nums">
        {program.dateLabel ?? dayLabel} {program.startLabel} –{' '}
        {program.endUndecided ? '終了未定' : program.endLabel}
        {program.durationLabel && (
          <span className="ml-[9px] text-sub text-ink-3">
            {program.durationLabel}
          </span>
        )}
      </p>
      <div className="mt-[13px] flex flex-wrap gap-[7px]">
        <Badge variant="info" className="font-bold">
          {program.genreLabel}
        </Badge>
        {program.subtitled && (
          <Badge variant="ok" className="font-bold">
            字幕あり
          </Badge>
        )}
      </div>

      <div className="mt-5 border-t border-dashed border-line pt-5">
        {program.description && (
          <p className="mb-5 text-[13.5px] leading-[1.95] whitespace-pre-wrap">
            {program.description}
          </p>
        )}
        {related.map((item) => (
          <RelatedNotice key={`${item.kind}-${item.key}`} related={item} />
        ))}
        {items.map((item, index) => (
          <ExtendedSection key={index} item={item} />
        ))}
        <dl className="grid grid-cols-3 gap-5 border-t border-dashed border-line pt-4 max-[700px]:grid-cols-2 max-[480px]:grid-cols-1">
          <div>
            <dt className="text-cap font-bold tracking-[.04em] text-ink-3">
              字幕
            </dt>
            <dd className="mt-0.5 text-[13.5px] font-medium">
              {program.subtitled ? 'あり' : 'なし'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex">
          <Button variant="link" size="sm" className="ml-auto" asChild>
            <Link
              href={`/search?q=${encodeURIComponent(mainTitleOf(program.title))}`}
            >
              この番組名で検索
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-[22px] border-t border-dashed border-line pt-[17px]">
        {onAir && (
          <div className="mb-[13px] flex flex-wrap gap-[9px]">
            <Button variant="outline" asChild>
              <Link
                href={liveScreenHref(program.channelId, channel?.kind) as Route}
              >
                <LiveIcon />
                ライブ視聴
              </Link>
            </Button>
          </div>
        )}
        {reservation ?? (
          <>
            <div className="flex flex-wrap gap-[9px]">
              <ReserveButton programmeId={program.id} onReserve={onReserve}>
                <RecordIcon />
                録画予約
              </ReserveButton>
              <Button
                variant="ghost"
                disabled
                title="シリーズ予約はこれから実装されます"
              >
                <ListIcon />
                シリーズで予約
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RelatedNotice({ related }: { related: RelatedProgram }) {
  const wording = RELATION_WORDING[related.kind]

  return (
    <div className="mb-[22px] flex items-start gap-[11px] rounded-lg bg-sky-soft px-4 py-[13px] text-ui leading-[1.75] text-sky max-[700px]:flex-wrap">
      <RelayIcon className="mt-[3px] size-[17px] shrink-0" />
      <p className="min-w-0 flex-1 font-bold">
        {wording.lead(related.channelLabel)}
      </p>
      <Link
        href={`/guide/programs/${related.key}`}
        className="tap-target ml-auto pl-[13px] font-bold whitespace-nowrap underline-offset-[3px] hover:underline max-[700px]:ml-0 max-[700px]:pl-0"
      >
        {wording.link}
      </Link>
    </div>
  )
}

function ExtendedSection({ item }: { item: ProgramItem }) {
  const HeadingIcon = /出演|司会|ゲスト|キャスト/.test(item.heading)
    ? PersonIcon
    : ListIcon

  return (
    <section className="mb-5">
      {item.heading && (
        <h2 className="heading mb-[7px] flex items-center gap-[7px] text-[13px]">
          <HeadingIcon className="size-[15px] shrink-0 text-brand" />
          {item.heading}
          <span className="h-px flex-1 border-t border-dashed border-line" />
        </h2>
      )}
      <p className="text-[13px] leading-[1.95] whitespace-pre-wrap text-ink-2">
        {item.text}
      </p>
    </section>
  )
}
