import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'

import type { Channel } from '@/repository/channels'
import type {
  Program,
  RelatedProgram,
  RelationKind,
} from '@/repository/programs'
import type { ReservationWrite } from '@/repository/reservations'
import {
  audioSaying,
  secondSoundSaying,
  videoSaying,
} from '@/repository/announced'
import { liveScreenHref } from '@/repository/live-paths'
import { relationDestinationOf } from '@/lib/guide'
import {
  NOT_YET_IN_THIS_BUILD,
  NOT_YET_IN_THIS_BUILD_SAYING,
  shapeFor,
} from '@/lib/not-yet-in-this-build'
import { mainTitleOf } from '@/lib/program-title'
import { newRuleHref, seriesTermsOf } from '@/lib/rules'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ListIcon,
  LiveIcon,
  RecordIcon,
  RelayIcon,
} from '@/components/vela/icons'
import { ChannelMark } from '@/components/vela/channel-mark'
import {
  ProgramDescription,
  ProgramExtended,
} from '@/components/guide/program-description'
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

const NOT_YET_KNOWN_RELATION: (typeof RELATION_WORDING)[RelationKind] = {
  lead: () => NOT_YET_IN_THIS_BUILD_SAYING,
  link: NOT_YET_IN_THIS_BUILD,
}

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
  const series = seriesTermsOf(program.title, program.channelId)

  return (
    <div data-program-detail>
      <div className="mb-[calc(9rem/16)] flex items-center gap-2.5">
        <ChannelMark logo={channel?.logo} no={channel?.no} />
        {channel?.name && (
          <span className="text-ui text-ink-2">{channel.name}</span>
        )}
      </div>
      <p className="font-code text-body tabular-nums">
        {program.dateLabel ?? dayLabel} {program.startLabel} –{' '}
        {program.endUndecided ? '終了未定' : program.endLabel}
        {program.durationLabel && (
          <span className="ml-[calc(9rem/16)] text-sub text-ink-3">
            {program.durationLabel}
          </span>
        )}
      </p>
      <div className="mt-[calc(13rem/16)] flex flex-wrap gap-[calc(7rem/16)]">
        <Badge variant="info" className="font-bold">
          {program.genreLabel}
        </Badge>
        {program.subtitled && (
          <Badge variant="ok" className="font-bold">
            字幕あり
          </Badge>
        )}
        {announcedOf(program).map(({ from, saying }) => (
          <Badge key={from} variant="secondary" className="font-bold">
            {saying}
          </Badge>
        ))}
      </div>

      <div className="mt-5 border-t border-dashed border-line pt-5">
        {program.description && (
          <ProgramDescription description={program.description} />
        )}
        {related.map((item) => (
          <RelatedNotice
            key={`${item.kind}-${item.key}`}
            related={item}
            onAir={onAir}
          />
        ))}
        {items.map((item, index) => (
          <ProgramExtended key={index} item={item} />
        ))}
        <dl className="grid grid-cols-3 gap-5 border-t border-dashed border-line pt-4 max-[700px]:grid-cols-2 max-[480px]:grid-cols-1">
          <div>
            <dt className="text-cap font-bold tracking-[.04em] text-ink-3">
              字幕
            </dt>
            <dd className="mt-0.5 text-body font-medium">
              {program.subtitled ? 'あり' : 'なし'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex">
          <Button variant="watch" size="sm" className="ml-auto" asChild>
            <Link
              href={`/search?q=${encodeURIComponent(mainTitleOf(program.title))}`}
            >
              この番組名で検索
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-[calc(22rem/16)] border-t border-dashed border-line pt-[calc(17rem/16)]">
        {onAir && (
          <div className="mb-[calc(13rem/16)] flex flex-wrap gap-[calc(9rem/16)]">
            <Button variant="watch" asChild>
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
            <div className="flex flex-wrap gap-[calc(9rem/16)]">
              <ReserveButton programmeId={program.id} onReserve={onReserve}>
                <RecordIcon />
                録画予約
              </ReserveButton>
              {series ? (
                <Button variant="ghost" asChild>
                  <Link href={newRuleHref(series)}>
                    <ListIcon />
                    シリーズで予約
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  disabled
                  title="番組名が読み取れないため、シリーズのルールにできません。"
                >
                  <ListIcon />
                  シリーズで予約
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface Announced {
  from: 'video' | 'audio' | 'sounds'
  saying: string
}

function announcedOf(program: Program): Announced[] {
  const said: Announced[] = [
    { from: 'video', saying: videoSaying(program.video) },
    { from: 'audio', saying: audioSaying(program.audio) },
    { from: 'sounds', saying: secondSoundSaying(program.sounds) },
  ].filter((one): one is Announced => one.saying !== undefined)
  const firstUnknown = said.findIndex(
    (one) => one.saying === NOT_YET_IN_THIS_BUILD,
  )

  return said.filter(
    (one, at) => one.saying !== NOT_YET_IN_THIS_BUILD || at === firstUnknown,
  )
}

function relatedHrefOf(
  related: RelatedProgram,
  onAir: boolean,
): string | undefined {
  const destination = relationDestinationOf(related, onAir)

  if (destination.to === 'programme') {
    return `/guide/programs/${destination.key}`
  }

  if (destination.to === 'live') {
    return liveScreenHref(destination.channelId, related.channelKind)
  }

  return undefined
}

function RelatedNotice({
  related,
  onAir,
}: {
  related: RelatedProgram
  onAir: boolean
}) {
  const wording = shapeFor(
    RELATION_WORDING,
    related.kind,
    NOT_YET_KNOWN_RELATION,
  )
  const href = relatedHrefOf(related, onAir)

  return (
    <div className="mb-[calc(22rem/16)] flex items-start gap-[calc(11rem/16)] rounded-lg bg-sky-soft px-4 py-[calc(13rem/16)] text-ui leading-[1.75] text-sky max-[700px]:flex-wrap">
      <RelayIcon className="mt-[calc(3rem/16)] size-[calc(17rem/16)] shrink-0" />
      <p className="min-w-0 flex-1 font-bold">
        {wording.lead(related.channelLabel)}
      </p>
      {href !== undefined && (
        <Link
          href={href as Route}
          className="tap-target ml-auto pl-[calc(13rem/16)] font-bold whitespace-nowrap underline-offset-[3px] hover:underline max-[700px]:ml-0 max-[700px]:pl-0"
        >
          {wording.link}
        </Link>
      )}
    </div>
  )
}
