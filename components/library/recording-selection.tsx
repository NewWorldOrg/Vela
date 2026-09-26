'use client'

import { useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
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
import { InlineAlert } from '@/components/vela/banner'
import { TrashIcon, WarningIcon } from '@/components/vela/icons'

const SIGNED_OUT = signedOut('操作')

export function RecordingSelection({
  chosen,
  onClear,
  onDeleteAll,
}: {
  chosen: Recording[]
  onClear: () => void
  onDeleteAll: (ids: string[]) => Promise<RecordingBatch>
}) {
  const [pending, startTransition] = useTransition()
  const [outcome, setOutcome] = useState<string>()
  const [removing, setRemoving] = useState(false)
  const deletable = chosen.every((one) => one.outcome !== 'recording')

  const remove = (): void => {
    startTransition(async () => {
      setOutcome(undefined)

      const result = await onDeleteAll(chosen.map((one) => one.id))

      if (result.state === 'ok') {
        onClear()

        return
      }

      const said =
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message

      setOutcome(
        result.done === 0 ? said : `${result.done} 件を削除しました。${said}`,
      )
    })
  }

  return (
    <div
      role="group"
      aria-label="選択した録画の操作"
      className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft px-[calc(17rem/16)] py-[calc(13rem/16)]"
    >
      <span className="text-ui font-medium whitespace-nowrap text-ink">
        <b className="font-code font-bold">{chosen.length}</b> 件を選択
      </span>
      <Button
        variant="remove"
        size="sm"
        disabled={pending || !deletable}
        onClick={() => setRemoving(true)}
      >
        <TrashIcon />
        削除
      </Button>
      <Button variant="halt" size="sm" disabled={pending} onClick={onClear}>
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
              variant="removeFill"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                setRemoving(false)
                remove()
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
