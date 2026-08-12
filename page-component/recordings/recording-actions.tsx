'use client'

import { useState } from 'react'

import type { Recording } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { PlayIcon, TrashIcon } from '@/components/vela/icons'
import { DeleteRecordingDialog } from '@/feature/recordings/delete-recording-dialog'

export function RecordingActions({ recording }: { recording: Recording }) {
  const [deleting, setDeleting] = useState<Recording | null>(null)
  const playable =
    recording.outcome !== 'failed' &&
    recording.outcome !== 'recording' &&
    !recording.fileMissing
  const deletable = recording.outcome !== 'recording'

  return (
    <>
      <div className="flex flex-wrap items-center gap-[9px]">
        <Button disabled={!playable}>
          <PlayIcon />
          再生
        </Button>
        <Button
          variant="outline"
          disabled
          title="エンコードはこれから実装されます"
        >
          エンコード
        </Button>
        <Button
          variant="destructive"
          className="ml-auto"
          disabled={!deletable}
          title={deletable ? '削除' : '録画中は削除できません'}
          onClick={() => setDeleting(recording)}
        >
          <TrashIcon />
          削除
        </Button>
      </div>
      <p className="mt-[9px] text-note leading-relaxed text-ink-3">
        プロファイルは1つのため、「エンコード」を押すと選択させずそのまま待機列へ登録します。元
        TS
        は削除されません。削除は録画ごと、ライブラリからの明示操作でのみ行われます。
      </p>
      <DeleteRecordingDialog
        recording={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  )
}
