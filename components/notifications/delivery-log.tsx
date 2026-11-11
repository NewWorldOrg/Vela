'use client'

import { cn } from '@/lib/utils'
import {
  deliveryClock,
  deliveryMoment,
  deliverySaid,
  eventLabelOf,
  type NotificationDelivery,
  type NotificationDestination,
  type Verdict,
} from '@/lib/notifications'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

const CHIP_OF: Record<Verdict, 'ok' | 'warn' | 'err' | 'mute'> = {
  ok: 'ok',
  warn: 'warn',
  err: 'err',
  calm: 'mute',
}

const DOT_OF: Record<Verdict, string> = {
  ok: 'bg-accent',
  warn: 'bg-warn',
  err: 'bg-rec',
  calm: 'bg-ink-3',
}

/** The columns of the log on a wide window; on a phone the time and destination share the first line, the event the second, and the state stands to the right of both. */
const ROW_AREAS = cn(
  'grid grid-cols-[calc(150rem/16)_minmax(0,1fr)_calc(190rem/16)_calc(230rem/16)] items-center gap-x-4 px-4',
  "[grid-template-areas:'tm_ev_to_st']",
  "upright:grid-cols-[minmax(0,1fr)_auto] upright:gap-x-2.5 upright:gap-y-1 upright:px-3.5 upright:py-2.5 upright:[grid-template-areas:'meta_st'_'ev_st']",
)

export function DeliveryLog({
  deliveries,
  destinations,
  now,
}: {
  deliveries: NotificationDelivery[]
  destinations: Pick<NotificationDestination, 'id' | 'name'>[]
  now?: number
}) {
  const names = new Map(destinations.map(({ id, name }) => [id, name]))

  return (
    <div className="mt-1 upright:overflow-hidden upright:rounded-lg upright:bg-surface">
      <div
        aria-hidden="true"
        className={cn(
          ROW_AREAS,
          'h-[calc(34rem/16)] text-note font-semibold text-ink-2 upright:hidden',
        )}
      >
        <span className="[grid-area:tm]">時刻</span>
        <span className="[grid-area:ev]">出来事</span>
        <span className="[grid-area:to]">送り先</span>
        <span className="[grid-area:st]">状態</span>
      </div>
      <ul aria-label="直近の配送">
        {deliveries.map((delivery) => (
          <DeliveryRow
            key={delivery.id}
            delivery={delivery}
            sentTo={names.get(delivery.destinationId)}
            now={now}
          />
        ))}
      </ul>
    </div>
  )
}

function DeliveryRow({
  delivery,
  sentTo,
  now,
}: {
  delivery: NotificationDelivery
  sentTo?: string
  now?: number
}) {
  const said = deliverySaid(delivery)

  return (
    <li
      data-delivery={delivery.id}
      className={cn(
        ROW_AREAS,
        'relative min-h-[calc(46rem/16)] text-ui before:absolute before:top-0 before:right-4 before:left-4 before:h-px before:bg-hair first:before:hidden upright:min-h-14 upright:before:right-0 upright:before:left-3.5',
      )}
    >
      <span className="contents upright:flex upright:min-w-0 upright:items-center upright:gap-1 upright:text-note upright:text-ink-2 upright:[grid-area:meta]">
        <span className="text-ink-2 tabular-nums [grid-area:tm]">
          <span className="upright:hidden">
            {deliveryMoment(delivery.occurredAt, now)}
          </span>
          <span className="hidden upright:inline">
            {deliveryClock(delivery.occurredAt)}
          </span>
        </span>
        <span aria-hidden="true" className="hidden upright:inline">
          ·
        </span>
        <span className="min-w-0 truncate text-ink-2 [grid-area:to]">
          {sentTo}
        </span>
      </span>
      <b className="min-w-0 truncate font-semibold text-ink [grid-area:ev]">
        {eventLabelOf(delivery.kind)}
      </b>
      <span className="[grid-area:st] upright:self-center">
        <Badge variant={CHIP_OF[said.verdict]}>
          <ChipDot className={DOT_OF[said.verdict]} />
          {said.words}
          {said.why && <span className="font-medium">· {said.why}</span>}
        </Badge>
      </span>
    </li>
  )
}
