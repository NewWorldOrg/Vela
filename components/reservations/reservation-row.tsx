'use client'

import Link from 'next/link'
import { ChannelMark } from '@/components/vela/channel-mark'
import { useState, useTransition } from 'react'

import { reservationAnchor } from '@/lib/reservations'
import { signedOut } from '@/lib/signed-out'
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
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import { StatusCell } from '@/components/recordings/status-cell'
import { ActionRow } from '@/components/vela/action-row'
import { InlineAlert } from '@/components/vela/banner'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CloseIcon,
  EditIcon,
  LibraryIcon,
  ListIcon,
  RebuildIcon,
  TrashIcon,
  TunerIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { arrivesIn, delayOf, rowDelayMs } from '@/lib/arrival'
import { Unfold } from '@/components/vela/unfold'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { ReservationStateChip } from '@/components/reservations/reservation-state-chip'
import { WHEN_LABELS } from '@/lib/when-terms'

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

export function ReservationRow({
  reservation,
  nth,
  expanded,
  shown,
  onToggle,
  onSettle,
  selected,
  onSelect,
  actions,
}: {
  reservation: Reservation
  nth: number
  expanded: boolean
  shown: boolean
  onToggle: () => void
  onSettle: () => void
  selected: boolean
  onSelect: (chosen: boolean) => void
  actions: ReservationActions
}) {
  const conflict = reservation.standing === 'conflict'
  const cancellable = conflict || reservation.standing === 'scheduled'
  const restorable = reservation.restorable
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
        data-state={selected ? 'selected' : undefined}
        style={delayOf(rowDelayMs(nth))}
        className={arrivesIn(nth)}
      >
        <TableCell className="h-11 align-top">
          <Checkbox
            checked={selected}
            onCheckedChange={(next) => onSelect(next === true)}
            aria-label={`${reservation.title} を選ぶ`}
          />
        </TableCell>
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
          <b className="block text-[calc(13rem/16)] font-bold">
            {reservation.title}
          </b>
          {reservation.note && (
            <span className="text-note text-ink-3">{reservation.note}</span>
          )}
        </TableCell>
        <TableCell className="align-top">
          <span className="flex items-center gap-2">
            <ChannelMark
              logo={reservation.channelLogo}
              no={reservation.channelNo}
              keepsTheSlot
            />
            <span className="min-w-0">{reservation.channelName}</span>
          </span>
        </TableCell>
        <TableCell className="align-top font-code text-ink-2">
          {reservation.whenLabel}
        </TableCell>
        <TableCell className="align-top">
          {reservation.ruleName ? (
            <span className="inline-flex items-center gap-1.5 text-ui text-ink-2">
              <ListIcon className="size-3" />
              {reservation.ruleName}
            </span>
          ) : (
            <span className="text-ink-2">{reservation.origin}</span>
          )}
        </TableCell>
        <TableCell className="align-top">
          <StatusCell>
            <ReservationStateChip reservation={reservation} say />
          </StatusCell>
        </TableCell>
        <TableCell className="text-right align-middle">
          <ActionRow className="gap-1.5">
            {reservation.recordingId && (
              <Button variant="watch" size="sm" asChild>
                <Link href={`/recordings/${reservation.recordingId}`}>
                  <LibraryIcon />
                  この予約の録画
                </Link>
              </Button>
            )}
            {restorable && (
              <Button
                variant="watch"
                size="sm"
                disabled={pending}
                onClick={() => run(() => actions.onRestore(reservation.id))}
              >
                <RebuildIcon />
                復元
              </Button>
            )}
            {cancellable && (
              <Button
                variant="change"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <EditIcon />
                編集
              </Button>
            )}
            {cancellable && (
              <Button
                variant="halt"
                size="sm"
                disabled={pending}
                onClick={() => run(() => actions.onCancel(reservation.id))}
              >
                <CloseIcon />
                取り消す
              </Button>
            )}
            {reservation.discardable && (
              <Button
                variant="remove"
                size="sm"
                disabled={pending}
                onClick={() => setRemoving(true)}
              >
                <TrashIcon />
                削除
              </Button>
            )}
          </ActionRow>
          {editing && (
            <EditReservationDialog
              booking={{
                id: reservation.id,
                title: reservation.title,
                priority: reservation.priority,
                marginBeforeSeconds: reservation.marginBeforeSeconds,
                marginAfterSeconds: reservation.marginAfterSeconds,
                encodeWhenRecorded: reservation.encodeWhenRecorded,
              }}
              open
              onOpenChange={setEditing}
              onRevise={actions.onRevise}
            />
          )}
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
                <dt className="text-ink-3">{WHEN_LABELS.broadcast}</dt>
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
              variant="removeFill"
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
      {shown && conflict && reservation.conflict && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="border-b-0 p-0">
            <Unfold
              open={expanded}
              onSettle={onSettle}
              bodyClassName="px-3.5 pb-3"
            >
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
                <ActionRow className="mt-2.5 gap-2 max-[900px]:w-full max-[900px]:grid-flow-row">
                  <Button
                    variant="change"
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
                    <ChevronUpIcon />
                    この予約の優先度を上げる
                  </Button>
                  <Button
                    variant="halt"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => actions.onCancel(reservation.id))}
                  >
                    <CloseIcon />
                    この予約を取り消す
                  </Button>
                  <Button variant="watch" size="sm" asChild>
                    <Link href="/settings/tuners">
                      <TunerIcon />
                      チューナーの使用状況を見る
                    </Link>
                  </Button>
                </ActionRow>
              </div>
            </Unfold>
          </TableCell>
        </TableRow>
      )}
      {refusal && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="border-b-0 px-3.5 pb-3">
            <span aria-live="polite">
              <InlineAlert tone="warn">{refusal}</InlineAlert>
            </span>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
