import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { Reservation } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ListIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { ReservationStateChip } from '@/page-component/reservations/reservation-state-chip'

export function ReservationRow({
  reservation,
  expanded,
  onToggle,
}: {
  reservation: Reservation
  expanded: boolean
  onToggle: () => void
}) {
  const conflict = reservation.state === 'conflict'

  return (
    <>
      <TableRow
        className={cn(
          conflict &&
            'bg-coral-soft/40 hover:bg-coral-soft/40 has-aria-expanded:bg-coral-soft/40',
        )}
      >
        <TableCell className="align-top">
          {conflict && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label="競合の詳細"
              onClick={onToggle}
              className="flex size-6 cursor-pointer items-center justify-center rounded-full text-coral transition-colors duration-150 hover:bg-coral-soft [&_svg]:size-3.5"
            >
              {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
          )}
        </TableCell>
        <TableCell className="align-top whitespace-normal">
          <b className="block text-[13px] font-bold">{reservation.title}</b>
          {reservation.note && (
            <span className="text-note text-ink-3">{reservation.note}</span>
          )}
        </TableCell>
        <TableCell className="align-top">
          {reservation.channelName}
          <small className="ml-1.5 font-code text-[10.5px] text-ink-3">
            {reservation.channelNo}
          </small>
        </TableCell>
        <TableCell className="align-top font-code text-ink-2">
          {reservation.whenLabel}
          {reservation.whenNote && (
            <small className="block font-sans text-[10.5px] text-ink-3">
              {reservation.whenNote}
            </small>
          )}
        </TableCell>
        <TableCell className="align-top">
          {reservation.ruleName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-[11px] py-0.5 text-note text-ink-2">
              <ListIcon className="size-3" />
              {reservation.ruleName}
            </span>
          ) : (
            <span className="text-ink-2">{reservation.origin}</span>
          )}
        </TableCell>
        <TableCell className="align-top">
          <ReservationStateChip reservation={reservation} />
          {reservation.stateNote && (
            <span className="mt-[3px] block text-[10.5px] leading-relaxed text-ink-3">
              {reservation.stateNote}
            </span>
          )}
        </TableCell>
        <TableCell className="text-right align-top">
          <Button
            variant="outline"
            size="sm"
            disabled
            title="予約の編集はこれから実装されます"
          >
            編集
          </Button>
        </TableCell>
      </TableRow>
      {conflict && expanded && reservation.conflict && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="border-b-0 px-3.5 pb-3">
            <div className="rounded-lg bg-surface px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-ui font-bold text-coral">
                <WarningIcon className="size-4" />
                {reservation.conflict.headline}
              </div>
              <p className="mt-1 text-sub leading-relaxed whitespace-normal text-ink-2">
                {reservation.conflict.body}
              </p>
              <div className="mt-2.5 space-y-1.5">
                {reservation.conflict.entries.map((entry) => (
                  <div
                    key={entry.title}
                    className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sub"
                  >
                    <span className="min-w-0 flex-1 font-medium">
                      {entry.title}
                    </span>
                    <span className="font-code text-ink-2">{entry.meta}</span>
                    <span className="text-ink-3">
                      {entry.ruleName ?? entry.origin}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-note leading-relaxed whitespace-normal text-ink-3">
                優先度を上げると、上のいずれかの予約が代わりに競合となります。
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="優先度の変更はこれから実装されます"
                >
                  この予約の優先度を上げる
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled
                  title="予約の取り消しはこれから実装されます"
                >
                  この予約を取り消す
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings/tuners">
                    チューナーの使用状況を見る
                  </Link>
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
