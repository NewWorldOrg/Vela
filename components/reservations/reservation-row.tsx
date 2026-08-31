'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { reservationAnchor } from '@/lib/reservations'
import type {
  Reservation,
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { InlineAlert } from '@/components/vela/banner'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ListIcon,
  TrashIcon,
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
  onDiscard: (id: string) => Promise<ReservationWrite>
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
  const [removing, setRemoving] = useState(false)

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
        id={reservationAnchor(reservation.id)}
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
          <span className="inline-flex flex-wrap justify-end gap-2">
            {reservation.recordingId && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/recordings/${reservation.recordingId}`}>
                  この予約の録画
                </Link>
              </Button>
            )}
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
              <>
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
              </>
            )}
            {reservation.discardable && (
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setRemoving(true)}
              >
                <TrashIcon />
                削除
              </Button>
            )}
          </span>
        </TableCell>
      </TableRow>
      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この予約を削除します</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left text-ui">
                <dt className="text-ink-3">番組</dt>
                <dd className="font-bold text-ink">{reservation.title}</dd>
                <dt className="text-ink-3">チャンネル</dt>
                <dd className="text-ink-2">{reservation.channelName}</dd>
                <dt className="text-ink-3">放送日時</dt>
                <dd className="font-code text-ink-2">
                  {reservation.whenLabel}
                </dd>
              </dl>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="flex items-start gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
            <WarningIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              予約の記録が消えます。元に戻せません。
              {reservation.standing === 'cancelled' &&
                '取り消した記録も無くなるため、この番組はふたたびルールの対象になります。'}
            </span>
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                setRemoving(false)
                run(() => actions.onDiscard(reservation.id))
              }}
            >
              <TrashIcon />
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
