'use client'

import { useState, useTransition } from 'react'

import { formatBytes } from '@/lib/format'
import type { Recording, RecordingDiscarded } from '@/repository/recordings'
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
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { QualityChip } from '@/components/recordings/quality-chip'

/**
 * What the size is qualified by: that the file is not there, or when the size
 * was last observed. A recording that says neither is left with the size
 * alone, rather than with an empty pair of brackets after it.
 */
function observationOf(recording: Recording): string | undefined {
  return recording.fileMissing ? '実ファイルなし' : recording.sizeObservedAt
}

const SIGNED_OUT = 'サインインが切れているため、操作できませんでした。'

export function DeleteRecordingDialog({
  recording,
  onOpenChange,
  onDelete,
}: {
  recording: Recording | null
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => Promise<RecordingDiscarded>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  const remove = (): void => {
    if (!recording) {
      return
    }

    startTransition(async () => {
      const result = await onDelete(recording.id)

      if (result.state === 'ok') {
        setRefusal(undefined)
        onOpenChange(false)

        return
      }

      // The reason is the API's own, and it is what says whether the files are
      // still there, so it stays in front of the reader with the question open.
      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <AlertDialog
      open={recording !== null}
      onOpenChange={(open) => {
        if (!open) {
          setRefusal(undefined)
        }

        onOpenChange(open)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この録画を削除します</AlertDialogTitle>
          {recording && (
            <AlertDialogDescription asChild>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left text-ui">
                <dt className="text-ink-3">番組</dt>
                <dd className="font-bold text-ink">{recording.title}</dd>
                <dt className="text-ink-3">チャンネル</dt>
                <dd className="text-ink-2">{recording.channel}</dd>
                <dt className="text-ink-3">録画日時</dt>
                <dd className="font-code text-ink-2">
                  {recording.recordedRange}
                </dd>
                <dt className="text-ink-3">サイズ</dt>
                <dd className="font-code text-ink-2">
                  {recording.sizeBytes == null
                    ? '—'
                    : formatBytes(recording.sizeBytes)}
                  {observationOf(recording) && ` (${observationOf(recording)})`}
                </dd>
                <dt className="text-ink-3">結果と品質</dt>
                <dd>
                  <OutcomeChip recording={recording} />{' '}
                  {recording.fileMissing && <FileMissingChip />}{' '}
                  <QualityChip recording={recording} withDetail={false} />
                </dd>
                <dt className="text-ink-3">ファイル</dt>
                <dd className="font-code text-ink-2">{recording.filePath}</dd>
              </dl>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <p className="flex items-center gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
          <WarningIcon className="size-4 shrink-0" />
          録画ファイルも削除されます。元に戻せません。
        </p>
        <span aria-live="polite">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
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
}
