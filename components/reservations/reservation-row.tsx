'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import type {
  Reservation,
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { InlineAlert } from '@/components/vela/banner'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ListIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { ReservationStateChip } from '@/components/reservations/reservation-state-chip'

export interface ReservationActions {
  onCancel: (id: string) => Promise<ReservationWrite>
  onRestore: (id: string) => Promise<ReservationWrite>
  onRaise: (id: string, priority: number) => Promise<ReservationWrite>
  onRevise: (
    id: string,
    revision: ReservationRevision,
  ) => Promise<ReservationWrite>
}

const SIGNED_OUT =
  'サインインが切れているため、操作できませんでした。サインインしてから開き直してください。'

export function ReservationRow({
  reservation,
  expanded,
  onToggle,
  actions,
}: {
  reservation: Reservation
  expanded: boolean
  onToggle: () => void
  actions: ReservationActions
}) {
  const conflict = reservation.standing === 'conflict'
  const cancellable = conflict || reservation.standing === 'scheduled'
  const restorable = reservation.standing === 'cancelled'
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [editing, setEditing] = useState(false)

  const run = (write: () => Promise<ReservationWrite>) => {
    startTransition(async () => {
      setRefusal(undefined)

      const result = await write()

      setRefusal(
        result.state === 'unauthenticated'
          ? SIGNED_OUT
          : result.state === 'rejected'
            ? result.message
            : undefined,
      )
    })
  }

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
              className="tap-target flex size-6 cursor-pointer items-center justify-center rounded-full text-coral transition-colors duration-150 hover:bg-coral-soft [&_svg]:size-3.5"
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
          {restorable ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => actions.onRestore(reservation.id))}
            >
              復元
            </Button>
          ) : (
            <span className="inline-flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                編集
              </Button>
              {/* Mounted only while it is open, so each opening reads the
                  reservation as it stands rather than as it stood when the
                  row was first drawn. */}
              {editing && (
                <EditReservationDialog
                  booking={{
                    id: reservation.id,
                    title: reservation.title,
                    priority: reservation.priority,
                    marginBeforeSeconds: reservation.marginBeforeSeconds,
                    marginAfterSeconds: reservation.marginAfterSeconds,
                  }}
                  open
                  onOpenChange={setEditing}
                  onRevise={actions.onRevise}
                />
              )}
              {cancellable && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => actions.onCancel(reservation.id))}
                >
                  取り消す
                </Button>
              )}
            </span>
          )}
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
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      actions.onRaise(
                        reservation.id,
                        reservation.conflict?.raiseTo ??
                          reservation.priority + 1,
                      ),
                    )
                  }
                >
                  この予約の優先度を上げる
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => actions.onCancel(reservation.id))}
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
      {refusal && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="border-b-0 px-3.5 pb-3">
            <span aria-live="polite">
              <InlineAlert tone="warn">{refusal}</InlineAlert>
            </span>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
