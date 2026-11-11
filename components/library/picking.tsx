'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'

import { signedOut } from '@/lib/signed-out'
import { type PickedSubject } from '@/lib/library-picking'
import { thumbnailRemakeSaying } from '@/lib/recordings'
import type {
  Recording,
  RecordingBatch,
  ThumbnailRemakeRow,
  ThumbnailRemakes,
} from '@/repository/recordings'
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
import { RebuildIcon, TrashIcon, WarningIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'

const SIGNED_OUT = signedOut('操作')

/** What the choosing bar and the phone's band press, and the question asked before the picked recordings go. */
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

/** One press at the end of the choosing bar and band: what it is called, its icon and colour, and whether it can be pressed now. `short` is the word a phone's band uses when the whole label would not fit beside the others. */
export interface PickedAction {
  label: string
  short?: string
  icon: ReactNode
  variant: 'danger' | 'redo'
  pending: boolean
  enabled: boolean
  onPress: () => void
}

/** The library's `削除` as the press at the end of the bar. */
export function deletionAction(deletion: PickedDeletion): PickedAction {
  return {
    label: '削除',
    icon: <TrashIcon />,
    variant: 'danger',
    pending: deletion.pending,
    enabled: deletion.deletable,
    onPress: deletion.ask,
  }
}

/** What the press of `サムネイルを再生成` did to the picked recordings: the press itself, and why each one that was not queued was left out. */
export interface PickedRemake {
  pending: boolean
  /** Whether `サムネイルを再生成` can be pressed: something is picked and none of it is still being recorded. */
  remakable: boolean
  remake: () => void
  said: ReadonlyMap<string, string>
}

const NO_REASONS: ReadonlyMap<string, string> = new Map()

/** Asks the backend to make the picked recordings' thumbnails again, says in one toast how many it took, and keeps the reason each one it did not take was left out, until choosing ends. */
export function usePickedRemake(
  chosen: Recording[],
  choosing: boolean,
  onRemakeAll: (ids: string[]) => Promise<ThumbnailRemakes>,
  onQueued: (ids: string[], every: boolean) => void,
): PickedRemake {
  const [pending, startTransition] = useTransition()
  const [said, setSaid] = useState<ReadonlyMap<string, string>>(NO_REASONS)
  const say = useToast()
  const remakable =
    chosen.length > 0 && chosen.every((one) => one.outcome !== 'recording')

  if (!choosing && said !== NO_REASONS) {
    setSaid(NO_REASONS)
  }

  const remake = (): void => {
    if (pending || !remakable) {
      return
    }

    startTransition(async () => {
      const result = await onRemakeAll(chosen.map((one) => one.id))

      if (result.state !== 'ok') {
        say({
          text:
            result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
        })

        return
      }

      const left = result.items.filter(
        (one): one is ThumbnailRemakeRow & { reason: string } =>
          one.reason !== undefined,
      )
      const queued = result.items
        .filter((one) => one.reason === undefined)
        .map((one) => one.id)

      setSaid(new Map(left.map((one) => [one.id, one.reason])))
      say({ text: thumbnailRemakeSaying(queued.length, left.length) })
      onQueued(queued, left.length === 0)
    })
  }

  return { pending, remakable, remake, said }
}

/** The library's `サムネイルを再生成` as a press on the bar, in the amber of doing something again. */
export function remakeAction(remake: PickedRemake): PickedAction {
  return {
    label: 'サムネイルを再生成',
    short: '再生成',
    icon: <RebuildIcon />,
    variant: 'redo',
    pending: remake.pending,
    enabled: remake.remakable,
    onPress: remake.remake,
  }
}

/** The room left at the end of a list that scrolls inside itself, so the floating bar does not cover its last row. */
export const ROOM_FOR_THE_BAR = 'pb-[calc(80rem/16)]'

/** Leaves choosing on Esc, unless a dialog, a menu or a list is open to take the key first. */
export function useLeaveOnEscape(choosing: boolean, leave: () => void): void {
  useEffect(() => {
    if (!choosing) {
      return
    }

    const leaveOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return
      }

      if (
        event.target instanceof Element &&
        event.target.closest(
          '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]',
        )
      ) {
        return
      }

      leave()
    }

    document.addEventListener('keydown', leaveOnEscape)

    return () => document.removeEventListener('keydown', leaveOnEscape)
  }, [choosing, leave])
}

export interface PickingControls {
  count: number
  everyPicked: boolean
  onEvery: () => void
  actions: readonly PickedAction[]
  subject: PickedSubject
}

export function whatItDoes(subject: PickedSubject): string {
  return `選んだ${subject}の操作`
}
