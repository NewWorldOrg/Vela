'use client'

import type { Route } from 'next'
import Link from 'next/link'

import { SPAN_DASH } from '@/lib/format'
import { newRuleHref, seriesTermsOf } from '@/lib/rules'
import type { SearchHit } from '@/repository/search'
import type { ReservationWrite } from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ChevronRightIcon } from '@/components/vela/icons'
import { ReservationArea } from '@/components/guide/reservation-area'
import { ProgramDescription } from '@/components/guide/program-description'
import { marked } from '@/components/search/phone-search-hits'

/** A hit beside the list on a phone held on its side: its title, when and where it is on, its genre and description, and the reservation, as the guide's detail lays them; the whole of it is a press away. */
export function HitDetail({
  hit,
  words,
  onReserve,
}: {
  hit: SearchHit
  words: readonly string[]
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
}) {
  const series = hit.channelId
    ? seriesTermsOf(hit.title, hit.channelId)
    : undefined

  return (
    <div data-slot="hit-detail">
      <h2 className="heading text-h2 leading-[1.45]">
        {marked(hit.title, words)}
      </h2>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-code text-sub text-ink-3 tabular-nums">
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
        <Badge variant="info" className="font-bold">
          {hit.genreLabel}
        </Badge>
        {hit.booked && (
          <Badge variant="ok" className="font-bold">
            予約済み
          </Badge>
        )}
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
          />
        )}
        <Button variant="watch" size="sm" className="mt-3" asChild>
          <Link href={`/guide/programs/${hit.id}` as Route}>
            番組の詳細へ
            <ChevronRightIcon />
          </Link>
        </Button>
      </div>
    </div>
  )
}
