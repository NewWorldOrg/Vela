'use client'

import { formatMomentSpan } from '@/lib/format'
import {
  leadingSegmentOf,
  relayCountSaying,
  relaySummaryOf,
  reservationAnchor,
} from '@/lib/reservations'
import type { Reservation } from '@/repository/reservations'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { cardPlace } from '@/components/ui/table-cards'
import { OriginCell } from '@/components/reservations/origin-cell'
import { StatusCell } from '@/components/recordings/status-cell'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ChevronDownIcon, ChevronRightIcon } from '@/components/vela/icons'
import { delayOf, rowArrivesIn, rowDelayMs } from '@/lib/arrival'
import {
  ReservationStateChip,
  reservationStateLabelOf,
} from '@/components/reservations/reservation-state-chip'

/**
 * The one line a relayed broadcast is listed as: its segments counted, its whole span, and the
 * state of the segment to look at first.
 */
export function RelayRow({
  segments,
  nth,
  open,
  onToggle,
  chosen,
  onSelect,
}: {
  segments: Reservation[]
  nth: number
  open: boolean
  onToggle: () => void
  chosen: number
  onSelect: (taken: boolean) => void
}) {
  const first = segments[0]
  const summary = relaySummaryOf(segments)
  const partial = summary.shown < summary.of
  const leading = leadingSegmentOf(segments)
  const said = segments.map(reservationStateLabelOf)
  const differ = new Set(said).size > 1

  return (
    <TableRow
      data-relay=""
      data-state={chosen === segments.length ? 'selected' : undefined}
      style={delayOf(rowDelayMs(nth))}
      className={rowArrivesIn(nth)}
    >
      <TableCell {...cardPlace('select')} className="h-11 align-top">
        <Checkbox
          checked={
            chosen === 0
              ? false
              : chosen === segments.length
                ? true
                : 'indeterminate'
          }
          onCheckedChange={(next) => onSelect(next === true)}
          aria-label={
            partial
              ? `${first.title} の表示中の区切り ${summary.shown} つを選ぶ`
              : `${first.title} の区切りをすべて選ぶ`
          }
        />
        {!open &&
          segments.map((one) => (
            <span key={one.id} id={reservationAnchor(one.id)} />
          ))}
      </TableCell>
      <TableCell {...cardPlace('end')} className="align-top">
        <button
          type="button"
          aria-expanded={open}
          aria-label="区切りの一覧"
          onClick={onToggle}
          className="tap-target flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 [&_svg]:size-3.5"
        >
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
      </TableCell>
      <TableCell {...cardPlace('lead')} className="align-top whitespace-normal">
        <b className="block text-[calc(13rem/16)] font-bold">{first.title}</b>
        <span className="text-note text-ink-2">
          {relayCountSaying(summary)}
        </span>
      </TableCell>
      <TableCell {...cardPlace('meta')} className="align-top">
        <span className="flex items-center gap-2">
          <ChannelMark
            logo={first.channelLogo}
            no={first.channelNo}
            keepsTheSlot
          />
          <span className="min-w-0">{first.channelName}</span>
        </span>
      </TableCell>
      <TableCell
        {...cardPlace('meta')}
        className="align-top font-code text-ink-2"
      >
        {formatMomentSpan(summary.startAt, summary.endAt)}
      </TableCell>
      <OriginCell origin={first.origin} ruleName={first.ruleName} />
      <TableCell {...cardPlace('field', '状態')} className="align-top">
        <StatusCell>
          <ReservationStateChip
            reservation={leading}
            say
            more={differ ? [breakdownOf(said)] : []}
          />
        </StatusCell>
      </TableCell>
      <TableCell {...cardPlace('actions')} />
    </TableRow>
  )
}

function breakdownOf(said: string[]): string {
  const counted = new Map<string, number>()

  for (const label of said) {
    counted.set(label, (counted.get(label) ?? 0) + 1)
  }

  return `区切りごと: ${[...counted].map(([label, count]) => `${label} ${count}`).join('、')}`
}
