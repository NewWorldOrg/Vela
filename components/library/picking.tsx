'use client'

import { useState, useTransition, type ReactNode, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import { pickedSaying } from '@/lib/library-picking'
import type { Recording, RecordingBatch } from '@/repository/recordings'
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
import {
  CheckIcon,
  CloseIcon,
  TrashIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { iconButtonVariants } from '@/components/vela/icon-button'
import { useToast } from '@/components/vela/toast'

const SIGNED_OUT = signedOut('操作')

/** What the choosing row and the phone's band press, and the question asked before the picked recordings go. */
export interface PickedDeletion {
  pending: boolean
  /** Whether `削除` can be pressed: something is picked and none of it is still being recorded. */
  deletable: boolean
  ask: () => void
  dialog: ReactNode
}

/** Asks before deleting the picked recordings, deletes them, and says what was left when not all of them went. */
export function usePickedDeletion(
  chosen: Recording[],
  onDeleteAll: (ids: string[]) => Promise<RecordingBatch>,
  onDone: () => void,
): PickedDeletion {
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState(false)
  const say = useToast()
  const deletable =
    chosen.length > 0 && chosen.every((one) => one.outcome !== 'recording')

  const remove = (): void => {
    startTransition(async () => {
      const result = await onDeleteAll(chosen.map((one) => one.id))

      if (result.state === 'ok') {
        onDone()

        return
      }

      const said =
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message

      say({
        text:
          result.done === 0 ? said : `${result.done} 件を削除しました。${said}`,
      })
    })
  }

  const dialog = (
    <AlertDialog open={asking} onOpenChange={setAsking}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            選択した {chosen.length} 件の録画を削除します
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <ul className="max-h-[calc(240rem/16)] space-y-1 overflow-y-auto text-left text-ui">
              {chosen.map((one) => (
                <li key={one.id} className="flex flex-wrap gap-x-3">
                  <b className="font-bold text-ink">{one.title}</b>
                  <span className="font-code text-ink-2">
                    {one.recordedRange}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="flex items-center gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
          <WarningIcon className="size-4 shrink-0" />
          録画ファイルも削除されます。元に戻せません。
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="danger"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              setAsking(false)
              remove()
            }}
          >
            <TrashIcon />
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { pending, deletable, ask: () => setAsking(true), dialog }
}

/** How many are picked, or while none is, that recordings are to be chosen. */
function PickedCount({
  count,
  className,
}: {
  count: number
  className: string
}) {
  const said = pickedSaying(count)

  if (count === 0) {
    return <span className={cn(className, 'text-ink-2')}>{said}</span>
  }

  return (
    <span className={cn(className, 'text-ink')}>
      <span className="font-code">{count}</span>
      {said.slice(String(count).length)}
    </span>
  )
}

interface PickingControls {
  count: number
  everyPicked: boolean
  onEvery: () => void
  deletion: PickedDeletion
}

const WHAT_IT_DOES = '選んだ録画の操作'

/** The heading's row while the library is choosing, in the heading's place and at its height: close, how many, every one, and `削除` at the end. */
export function PickingRow({
  count,
  everyPicked,
  onEvery,
  onClose,
  deletion,
  closeRef,
  className,
}: PickingControls & {
  onClose: () => void
  closeRef?: Ref<HTMLButtonElement>
  className?: string
}) {
  return (
    <div
      role="toolbar"
      aria-label={WHAT_IT_DOES}
      data-slot="picking-row"
      className={cn('flex min-w-0 items-center', className)}
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className={cn(
          iconButtonVariants({ variant: 'quiet' }),
          'mr-3.5 size-10 bg-surface text-ink not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink [&_svg]:size-[calc(18rem/16)]',
        )}
      >
        <CloseIcon />
      </button>
      <PickedCount
        count={count}
        className="text-section font-bold whitespace-nowrap"
      />
      <Button variant="tone" className="ml-5" onClick={onEvery}>
        {everyPicked ? 'すべて外す' : 'すべて選ぶ'}
      </Button>
      <Button
        variant="danger"
        className="ml-auto"
        disabled={deletion.pending || !deletion.deletable}
        onClick={deletion.ask}
      >
        <TrashIcon />
        削除
      </Button>
    </div>
  )
}

/** The band over a phone's tabs while the library is choosing: how many, every one, and `削除`. */
export function PickingBand({
  count,
  everyPicked,
  onEvery,
  deletion,
  className,
}: PickingControls & { className?: string }) {
  return (
    <div
      role="toolbar"
      aria-label={WHAT_IT_DOES}
      data-slot="picking-band"
      className={cn(
        'fixed inset-x-0 bottom-[var(--tab-bar-cover)] z-50 flex h-[calc(60rem/16)] items-center gap-2 bg-bg pr-3 pl-[calc(18rem/16)] shadow-[0_-1px_0_var(--hair)] sideways:left-[calc(80rem/16+env(safe-area-inset-left))] sideways:pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <PickedCount
        count={count}
        className="text-title font-semibold whitespace-nowrap"
      />
      <Button
        variant="tone"
        className="ml-auto h-[calc(38rem/16)] px-[calc(15rem/16)] text-ui"
        onClick={onEvery}
      >
        {everyPicked ? 'すべて外す' : 'すべて選ぶ'}
      </Button>
      <Button
        variant="danger"
        className="h-[calc(38rem/16)] px-[calc(15rem/16)] text-ui"
        disabled={deletion.pending || !deletion.deletable}
        onClick={deletion.ask}
      >
        <TrashIcon />
        削除
      </Button>
    </div>
  )
}

/** The mark over a picture while the library is choosing: a rounded square cut from the picture by a white edge, filled with a tick once taken. */
export function PickMark({
  taken,
  size = 'row',
  className,
}: {
  taken: boolean
  size?: 'tile' | 'row' | 'phone'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="pick-mark"
      data-taken={taken || undefined}
      className={cn(
        'pointer-events-none absolute z-[2] grid place-items-center text-on-accent',
        MARK_SIZE[size],
        taken
          ? 'bg-accent-fill shadow-[0_0_0_2px_#fff,0_1px_3px_rgba(0,0,0,.35)]'
          : 'bg-[rgba(20,20,22,.22)] shadow-[inset_0_0_0_2px_#fff,0_1px_3px_rgba(0,0,0,.35)]',
        className,
      )}
    >
      {taken && <CheckIcon className={TICK_SIZE[size]} strokeWidth={3} />}
    </span>
  )
}

const MARK_SIZE = {
  tile: 'top-[calc(9rem/16)] left-[calc(9rem/16)] size-[calc(22rem/16)] rounded-[calc(6rem/16)]',
  row: 'top-1.5 left-1.5 size-[calc(18rem/16)] rounded-[calc(6rem/16)]',
  phone: 'top-1.5 left-1.5 size-5 rounded-[calc(6rem/16)]',
} as const

const TICK_SIZE = {
  tile: 'size-[calc(15rem/16)]',
  row: 'size-3',
  phone: 'size-[calc(13rem/16)]',
} as const

/** The shade at the head of a picture while choosing, so its mark reads on a bright picture. */
export function PickShade() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,0)_42%)]"
    />
  )
}
