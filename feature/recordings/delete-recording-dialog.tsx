'use client'

import { formatBytes } from '@/lib/format'
import type { Recording } from '@/repository/recordings'
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
import { TrashIcon, WarningIcon } from '@/components/vela/icons'
import { FileMissingChip } from '@/feature/recordings/file-missing-chip'
import { OutcomeChip } from '@/feature/recordings/outcome-chip'
import { QualityChip } from '@/feature/recordings/quality-chip'

export function DeleteRecordingDialog({
  recording,
  onOpenChange,
}: {
  recording: Recording | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={recording !== null} onOpenChange={onOpenChange}>
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
                  {formatBytes(recording.sizeBytes)}(
                  {recording.fileMissing
                    ? '実ファイルなし'
                    : recording.sizeObservedAt}
                  )
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
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled
            title="削除はこれから実装されます"
          >
            <TrashIcon />
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
