'use client'

import { useTransition } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  watchLine,
  type NotificationWrite,
  type WatchedProgramme,
} from '@/lib/notifications'
import { delayOf, rowArrivesIn, rowDelayMs } from '@/lib/arrival'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/vela/icon-button'
import { CloseIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toasts'
import {
  PICKING_GRID,
  ROW_GRID,
  ROW_GROUND,
  ROW_LINE,
} from '@/components/reservations/reservation-row'
import { RowTimes } from '@/components/reservations/row-times'
import { NotifyBell } from '@/components/notifications/notify-bell'

export const NOTIFY_ONLY = '通知'

const SIGNED_OUT = signedOut('操作')

/** What to say once a single notice was asked to be taken back. */
export function takenBackWords(
  result: NotificationWrite,
  title: string,
): string {
  if (result.state === 'ok') {
    return `通知を取り消しました　${title}`
  }

  return result.state === 'unauthenticated' ? SIGNED_OUT : result.message
}

/** A notice that a programme starts, standing among the reservations: a bell where a reservation has its genre's dot, and `通知` where it has its state. */
export function NotifyOnlyRow({
  watch,
  nth,
  picking = false,
  onCancel,
}: {
  watch: WatchedProgramme
  nth: number
  /** While reservations are being picked the row keeps their columns, with nothing to check. */
  picking?: boolean
  onCancel: (id: string) => Promise<NotificationWrite>
}) {
  const [pending, startTransition] = useTransition()
  const say = useToast()

  return (
    <li
      data-watch={watch.id}
      data-picking={picking ? '' : undefined}
      style={delayOf(rowDelayMs(nth))}
      className={cn(rowArrivesIn(nth), ROW_LINE)}
    >
      <div className={cn(ROW_GRID, ROW_GROUND, picking && PICKING_GRID)}>
        {picking && <span aria-hidden="true" />}
        <RowTimes
          span={{ startAt: watch.startAt, endAt: watch.endAt }}
          whenLabel=""
        />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2 text-title font-semibold tracking-[-0.008em] text-ink">
            <NotifyBell />
            <span className="min-w-0 truncate">{watch.title}</span>
          </span>
          <span className="mt-0.5 block truncate text-sub text-ink-2">
            {watchLine(watch)}
          </span>
        </span>
        <span className="flex items-center justify-end gap-2">
          <Badge variant="info">{NOTIFY_ONLY}</Badge>
          <IconButton
            variant="quiet"
            aria-label={`${watch.title} の通知を取り消す`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                say({
                  text: takenBackWords(await onCancel(watch.id), watch.title),
                })
              })
            }
          >
            <CloseIcon />
          </IconButton>
        </span>
      </div>
    </li>
  )
}
