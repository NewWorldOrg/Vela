'use client'

import type { Route } from 'next'
import Link from 'next/link'

import { SPAN_DASH } from '@/lib/format'
import { newRuleHref, seriesTermsOf } from '@/lib/rules'
import type { Noticing } from '@/lib/notifications'
import type { SearchHit } from '@/repository/search'
import type { ReservationWrite } from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { GenrePill } from '@/components/vela/genre-pill'
import { Button } from '@/components/ui/button'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ChevronRightIcon } from '@/components/vela/icons'
import { ReservationArea } from '@/components/guide/reservation-area'
import { ProgramDescription } from '@/components/guide/program-description'
import { NotifyLeadChip } from '@/components/notifications/notify-lead-chip'
import { NotifyStartButton } from '@/components/notifications/notify-start-button'
import { marked } from '@/components/search/hit-parts'

/** A hit beside the list on a phone held on its side: its title, when and where it is on, its genre and description, the reservation and, while it has not started, the notice of its start, as the guide's detail lays them; the whole of it is a press away. */
export function HitDetail({
  hit,
  words,
  onReserve,
  noticing,
}: {
  hit: SearchHit
  words: readonly string[]
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
  noticing?: Noticing
}) {
  const series = hit.channelId
    ? seriesTermsOf(hit.title, hit.channelId)
    : undefined

  return (
    <div data-slot="hit-detail">
      <h2 className="heading text-section leading-[1.45]">
        {marked(hit.title, words)}
      </h2>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-code text-sub text-ink-2 tabular-nums">
        <span>
          {hit.dayLabel} {hit.startLabel}
          {SPAN_DASH}
          {hit.endUndecided ? '終了未定' : hit.endLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 font-body">
          <ChannelMark logo={hit.channelLogo} no={hit.channelNo} />
          {hit.channelName}
        </span>
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <GenrePill genre={hit.genre} className="font-bold">
          {hit.genreLabel}
        </GenrePill>
        {hit.booked && (
          <Badge variant="warn" className="font-bold">
            予約済み
          </Badge>
        )}
        {hit.watch && <NotifyLeadChip leadMinutes={hit.watch.leadMinutes} />}
      </div>
      {hit.description && (
        <div className="mt-3.5 border-t border-dashed border-line pt-3.5">
          <ProgramDescription description={hit.description} />
        </div>
      )}
      <div className="mt-3.5 border-t border-dashed border-line pt-3.5">
        {onReserve && !hit.booked && (
          <ReservationArea
            programmeId={hit.id}
            seriesHref={series ? newRuleHref(series) : undefined}
            onReserve={onReserve}
            notice={
              hit.ahead &&
              noticing && (
                <NotifyStartButton
                  programmeId={hit.id}
                  watch={hit.watch}
                  noticing={noticing}
                />
              )
            }
          />
        )}
        <Button variant="tone" size="sm" className="mt-3" asChild>
          <Link href={`/guide/programs/${hit.id}` as Route}>
            番組の詳細へ
            <ChevronRightIcon />
          </Link>
        </Button>
      </div>
    </div>
  )
}
