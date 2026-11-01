'use client'

import Link from 'next/link'
import { useId, useState, useTransition } from 'react'

import { reservationAnchor } from '@/lib/reservations'
import { formatClock } from '@/lib/format'
import { signedOut } from '@/lib/signed-out'
import type {
  ConflictEntry,
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
import { Checkbox } from '@/components/ui/checkbox'
import { InlineAlert } from '@/components/vela/banner'
import { IconButton } from '@/components/vela/icon-button'
import { CloseIcon, TrashIcon, WarningIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'
import { delayOf, rowArrivesIn, rowDelayMs } from '@/lib/arrival'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { DisplacedNotice } from '@/components/reservations/displaced-notice'
import { GenreDot } from '@/components/reservations/genre-dot'
import { ReservationAttention } from '@/components/reservations/reservation-state-chip'
import { WHEN_LABELS } from '@/lib/when-terms'
import { cn } from '@/lib/utils'

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

const SIGNED_OUT = signedOut('操作')

/** The grid of a row in the list: the times, the title and its line, then the chips and the press at its end. With a check before them while reservations are being picked. */
export const ROW_GRID =
  'grid min-h-[calc(62rem/16)] grid-cols-[calc(76rem/16)_minmax(0,1fr)_auto] items-center gap-x-5 px-2.5 py-2'

export const PICKING_GRID =
  'grid-cols-[calc(24rem/16)_calc(76rem/16)_minmax(0,1fr)_auto]'

/** A hairline between rows from the title on, gone beside a row a pointer rests on or one that is open. */
export const ROW_LINE =
  "relative before:absolute before:top-0 before:right-2.5 before:left-[calc(116rem/16)] before:border-t before:border-hair before:content-[''] before:transition-opacity before:duration-[140ms] first:before:hidden has-[>div:first-child:hover]:before:opacity-0 data-open:before:opacity-0 [&:has(>div:first-child:hover)+li]:before:opacity-0 [&[data-open]+li]:before:opacity-0 data-[picking]:before:left-[calc(160rem/16)]"

export const ROW_GROUND =
  'rounded-md transition-[background-color] duration-[140ms] ease-toy hover:bg-surface'

function clockOf(at: string): string {
  return formatClock(new Date(at).getTime())
}

/** The start in the row's own size and the end under it, quieter. */
export function RowTimes({
  span,
  whenLabel,
}: {
  span?: { startAt: string; endAt: string }
  whenLabel: string
}) {
  if (!span) {
    return (
      <span className="font-code text-sub leading-[calc(18rem/16)] text-ink-2">
        {whenLabel}
      </span>
    )
  }

  return (
    <span className="flex flex-col font-code leading-[calc(18rem/16)] tabular-nums">
      <span className="text-title font-semibold text-ink">
        {clockOf(span.startAt)}
      </span>
      <span className="text-sub text-ink-2">– {clockOf(span.endAt)}</span>
    </span>
  )
}

/** The line under a title: the channel, then where the reservation came from, with the rule's name when a rule made it. */
export function whereFrom(reservation: Reservation): string {
  return reservation.ruleName
    ? `${reservation.origin}「${reservation.ruleName}」`
    : reservation.origin
}

export function ReservationRow({
  reservation,
  nth,
  open,
  onToggle,
  picking,
  selected,
  onSelect,
  actions,
  segment,
  loses,
}: {
  reservation: Reservation
  segment?: { nth: number; of: number }
  nth: number
  open: boolean
  onToggle: () => void
  picking: boolean
  selected: boolean
  onSelect: (chosen: boolean) => void
  actions: ReservationActions
  loses?: string
}) {
  const cancellable =
    reservation.standing === 'conflict' || reservation.standing === 'scheduled'
  const changeable = cancellable
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [displaced, setDisplaced] = useState<ConflictEntry[]>()
  const [removing, setRemoving] = useState(false)
  const say = useToast()
  const panel = useId()

  const settle = (result: ReservationWrite) => {
    setRefusal(
      result.state === 'unauthenticated'
        ? SIGNED_OUT
        : result.state === 'rejected'
          ? result.message
          : undefined,
    )
    setDisplaced(result.state === 'ok' ? result.displaced : undefined)
  }

  const run = (write: () => Promise<ReservationWrite>) => {
    startTransition(async () => {
      setRefusal(undefined)
      setDisplaced(undefined)
      settle(await write())
    })
  }

  const takeBack = () =>
    startTransition(async () => {
      setRefusal(undefined)
      setDisplaced(undefined)

      const result = await actions.onCancel(reservation.id)

      settle(result)

      if (result.state === 'ok') {
        say({
          text: '予約を取り消しました',
          action: {
            label: '元に戻す',
            onPress: () => void actions.onRestore(reservation.id),
          },
        })
      }
    })

  const revise = async (id: string, revision: ReservationRevision) => {
    setDisplaced(undefined)

    const result = await actions.onRevise(id, revision)

    if (result.state === 'ok') {
      settle(result)
    }

    return result
  }

  const title = (
    <>
      <GenreDot genre={reservation.genre} />
      <span className="min-w-0 truncate">{reservation.title}</span>
    </>
  )

  return (
    <li
      id={reservationAnchor(reservation.id)}
      data-reservation={reservation.id}
      data-state={selected ? 'selected' : undefined}
      data-segment={segment ? '' : undefined}
      data-open={open ? '' : undefined}
      data-picking={picking ? '' : undefined}
      style={delayOf(rowDelayMs(nth))}
      className={cn(rowArrivesIn(nth), ROW_LINE)}
    >
      <div
        className={cn(
          'relative',
          ROW_GRID,
          ROW_GROUND,
          picking && PICKING_GRID,
          (open || selected) && 'bg-surface',
          open && 'rounded-b-none',
        )}
      >
        {picking && (
          <Checkbox
            checked={selected}
            onCheckedChange={(next) => onSelect(next === true)}
            aria-label={`${reservation.title} を選ぶ`}
            className="relative z-[2]"
          />
        )}
        <RowTimes span={reservation.span} whenLabel={reservation.whenLabel} />
        <span className="min-w-0">
          {changeable ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? panel : undefined}
              onClick={onToggle}
              className="flex w-full min-w-0 cursor-pointer items-center gap-2 text-left text-title font-semibold tracking-[-0.008em] text-ink outline-none after:absolute after:inset-0 after:z-[1] after:rounded-md after:content-[''] focus-visible:after:shadow-ring"
            >
              {title}
            </button>
          ) : (
            <span className="flex min-w-0 items-center gap-2 text-title font-semibold tracking-[-0.008em] text-ink">
              {title}
            </span>
          )}
          <span className="mt-0.5 block truncate text-sub text-ink-2">
            {reservation.channelName}
            {segment && ` · 区切り ${segment.nth} / ${segment.of}`}
            {` · ${whereFrom(reservation)}`}
          </span>
        </span>
        <span className="relative z-[2] flex min-w-0 items-center justify-end gap-2">
          <span
            data-slot="row-chips"
            className="flex flex-wrap items-center justify-end gap-1.5"
          >
            <ReservationAttention reservation={reservation} loses={loses} />
          </span>
          {reservation.recordingId && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/recordings/${reservation.recordingId}`}>
                この予約の録画へ
              </Link>
            </Button>
          )}
          {reservation.restorable && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => actions.onRestore(reservation.id))}
            >
              復元
            </Button>
          )}
          {reservation.discardable && (
            <IconButton
              variant="quiet"
              aria-label="削除"
              disabled={pending}
              onClick={() => setRemoving(true)}
            >
              <TrashIcon />
            </IconButton>
          )}
          {cancellable ? (
            <IconButton
              variant="quiet"
              aria-label="取り消し"
              disabled={pending}
              onClick={takeBack}
            >
              <CloseIcon />
            </IconButton>
          ) : (
            !reservation.discardable && (
              <span aria-hidden="true" className="w-[calc(34rem/16)]" />
            )
          )}
        </span>
      </div>
      {open && changeable && (
        <div
          id={panel}
          className="rounded-b-md bg-surface pt-1.5 pr-4 pb-4 pl-[calc(116rem/16)]"
        >
          {reservation.note && (
            <p className="mb-3.5 text-sub text-ink-2">{reservation.note}</p>
          )}
          <EditReservationDialog
            key={reservation.id}
            layout="row"
            open
            onOpenChange={(next) => !next && onToggle()}
            onRevise={revise}
            booking={{
              id: reservation.id,
              title: reservation.title,
              priority: reservation.priority,
              marginBeforeSeconds: reservation.marginBeforeSeconds,
              marginAfterSeconds: reservation.marginAfterSeconds,
              encodeWhenRecorded: reservation.encodeWhenRecorded,
            }}
          />
        </div>
      )}
      {(refusal || displaced) && (
        <div
          aria-live="polite"
          className="pt-1.5 pr-2.5 pb-3 pl-[calc(116rem/16)]"
        >
          {refusal ? (
            <InlineAlert tone="warn">{refusal}</InlineAlert>
          ) : (
            <DisplacedNotice entries={displaced} />
          )}
        </div>
      )}
      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この予約を削除します</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left text-ui">
                <dt className="text-ink-2">番組</dt>
                <dd className="font-bold text-ink">{reservation.title}</dd>
                <dt className="text-ink-2">チャンネル</dt>
                <dd className="text-ink-2">{reservation.channelName}</dd>
                <dt className="text-ink-2">{WHEN_LABELS.broadcast}</dt>
                <dd className="font-code text-ink-2">
                  {reservation.whenLabel}
                </dd>
              </dl>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="flex items-start gap-2 rounded-md bg-rec-soft px-3.5 py-2.5 text-ui font-medium text-rec-text">
            <WarningIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              予約の記録が消えます。元に戻せません。
              {reservation.standing === 'cancelled' &&
                '取り消した記録もなくなるため、この番組はふたたびルールの対象になります。'}
            </span>
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              variant="dangerFill"
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
    </li>
  )
}
