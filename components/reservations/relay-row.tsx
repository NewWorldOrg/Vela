'use client'

import {
  leadingSegmentOf,
  relayCountSaying,
  relaySummaryOf,
  reservationAnchor,
} from '@/lib/reservations'
import type { Reservation } from '@/repository/reservations'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDownIcon, ChevronRightIcon } from '@/components/vela/icons'
import { delayOf, rowArrivesIn, rowDelayMs } from '@/lib/arrival'
import { cn } from '@/lib/utils'
import { GenreDot } from '@/components/reservations/genre-dot'
import {
  PICKING_GRID,
  ROW_GRID,
  ROW_GROUND,
  ROW_LINE,
  RowTimes,
  whereFrom,
} from '@/components/reservations/reservation-row'
import {
  ReservationStateChip,
  reservationStateLabelOf,
} from '@/components/reservations/reservation-state-chip'

/**
 * The one line a relayed broadcast is listed as: its whole span, its segments counted, and the state of the segment to
 * look at first. Pressing it lays its segments out under it.
 */
export function RelayRow({
  segments,
  nth,
  open,
  onToggle,
  picking,
  chosen,
  onSelect,
}: {
  segments: Reservation[]
  nth: number
  open: boolean
  onToggle: () => void
  picking: boolean
  chosen: number
  onSelect: (taken: boolean) => void
}) {
  const first = segments[0]
  const summary = relaySummaryOf(segments)
  const partial = summary.shown < summary.of
  const leading = leadingSegmentOf(segments)
  const said = segments.map(reservationStateLabelOf)
  const differ = new Set(said).size > 1
  const quiet = leading.standing === 'scheduled' && !differ

  return (
    <li
      data-relay=""
      data-state={chosen === segments.length ? 'selected' : undefined}
      data-open={open ? '' : undefined}
      data-picking={picking ? '' : undefined}
      style={delayOf(rowDelayMs(nth))}
      className={cn(rowArrivesIn(nth), ROW_LINE)}
    >
      {!open &&
        segments.map((one) => (
          <span key={one.id} id={reservationAnchor(one.id)} />
        ))}
      <div
        className={cn(
          'relative',
          ROW_GRID,
          ROW_GROUND,
          picking && PICKING_GRID,
          (open || chosen === segments.length) && 'bg-surface',
        )}
      >
        {picking && (
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
            className="relative z-[2]"
          />
        )}
        <RowTimes
          span={
            summary.startAt && summary.endAt
              ? { startAt: summary.startAt, endAt: summary.endAt }
              : undefined
          }
          whenLabel={first.whenLabel}
        />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2 text-title font-semibold tracking-[-0.008em] text-ink">
            <GenreDot genre={first.genre} />
            <span className="min-w-0 truncate">{first.title}</span>
          </span>
          <span className="mt-0.5 block truncate text-sub text-ink-2">
            {first.channelName} · {relayCountSaying(summary)} ·{' '}
            {whereFrom(first)}
          </span>
        </span>
        <span className="flex items-center justify-end gap-2">
          {!quiet && (
            <span data-slot="row-chips" className="relative z-[2] flex">
              <ReservationStateChip
                reservation={leading}
                more={differ ? [breakdownOf(said)] : []}
              />
            </span>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-label="区切りの一覧"
            onClick={onToggle}
            className="flex size-[calc(34rem/16)] cursor-pointer items-center justify-center rounded-full text-ink-2 outline-none after:absolute after:inset-0 after:z-[1] after:rounded-md after:content-[''] focus-visible:after:shadow-ring [&_svg]:size-4"
          >
            {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>
        </span>
      </div>
    </li>
  )
}

function breakdownOf(said: string[]): string {
  const counted = new Map<string, number>()

  for (const label of said) {
    counted.set(label, (counted.get(label) ?? 0) + 1)
  }

  return `区切りごと: ${[...counted].map(([label, count]) => `${label} ${count}`).join('、')}`
}
