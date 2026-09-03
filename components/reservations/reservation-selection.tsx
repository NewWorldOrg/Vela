'use client'

import { useState, useTransition } from 'react'

import type { Reservation, ReservationBatch } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
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
import { InlineAlert } from '@/components/vela/banner'
import { TrashIcon, WarningIcon } from '@/components/vela/icons'

export interface ReservationBulkActions {
  onCancelAll: (ids: string[]) => Promise<ReservationBatch>
  onDiscardAll: (ids: string[]) => Promise<ReservationBatch>
}

const SIGNED_OUT = 'サインインが切れているため、操作できませんでした。'

/**
 * The bar the list grows when rows are chosen. It offers what a single row
 * offers and nothing more, and each of those is offered only while every chosen
 * row would take it — a button that acts on some of the selection and refuses
 * the rest leaves the reader working out which.
 */
export function ReservationSelection({
  chosen,
  onClear,
  actions,
}: {
  chosen: Reservation[]
  onClear: () => void
  actions: ReservationBulkActions
}) {
  const [pending, startTransition] = useTransition()
  const [outcome, setOutcome] = useState<string>()
  const [removing, setRemoving] = useState(false)
  const ids = chosen.map((one) => one.id)
  const cancellable = chosen.every(
    (one) => one.standing === 'scheduled' || one.standing === 'conflict',
  )
  const discardable = chosen.every((one) => one.discardable)

  const run = (
    write: (ids: string[]) => Promise<ReservationBatch>,
    went: (done: number) => string,
  ) => {
    startTransition(async () => {
      setOutcome(undefined)

      const result = await write(ids)

      if (result.state === 'ok') {
        onClear()

        return
      }

      const said =
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message

      setOutcome(result.done === 0 ? said : `${went(result.done)}${said}`)
    })
  }

  return (
    <div
      role="group"
      aria-label="選択した予約の操作"
      className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft px-[17px] py-[13px]"
    >
      <span className="text-ui font-medium whitespace-nowrap text-ink">
        <b className="font-code font-bold">{chosen.length}</b> 件を選択
      </span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending || !cancellable}
        onClick={() =>
          run(actions.onCancelAll, (done) => `${done} 件を取り消しました。`)
        }
      >
        取り消す
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending || !discardable}
        onClick={() => setRemoving(true)}
      >
        <TrashIcon />
        削除
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={onClear}>
        選択を解除
      </Button>
      {outcome && (
        <span aria-live="polite" className="basis-full">
          <InlineAlert tone="warn">{outcome}</InlineAlert>
        </span>
      )}
      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              選択した {chosen.length} 件の予約を削除します
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ul className="max-h-[240px] space-y-1 overflow-y-auto text-left text-ui">
                {chosen.map((one) => (
                  <li key={one.id} className="flex flex-wrap gap-x-3">
                    <b className="font-bold text-ink">{one.title}</b>
                    <span className="font-code text-ink-2">
                      {one.whenLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="flex items-start gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
            <WarningIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              予約の記録が消えます。元に戻せません。
              {chosen.some((one) => one.standing === 'cancelled') &&
                '取り消した記録も無くなるため、その番組はふたたびルールの対象になります。'}
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
                run(
                  actions.onDiscardAll,
                  (done) => `${done} 件を削除しました。`,
                )
              }}
            >
              <TrashIcon />
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
