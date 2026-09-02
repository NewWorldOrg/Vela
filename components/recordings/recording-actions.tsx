'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { PlayIcon, TrashIcon } from '@/components/vela/icons'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'

export function RecordingActions({
  recording,
  onDelete,
  plays,
}: {
  recording: Recording
  onDelete: (id: string) => Promise<RecordingDiscarded>
  /** Whether the picture is drawn on this page, above these buttons. */
  plays?: boolean
}) {
  const deletable = recording.outcome !== 'recording'
  const router = useRouter()
  const [asked, setAsked] = useState<Recording | null>(null)

  // The screen stands on the recording that has just gone, so what is left to
  // read is the list it was in.
  const remove = async (id: string): Promise<RecordingDiscarded> => {
    const result = await onDelete(id)

    if (result.state === 'ok') {
      router.push('/library')
    }

    return result
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-[9px]">
        <Button
          disabled
          title={
            plays
              ? '再生はこの上のプレイヤーで操作します'
              : 'この録画には再生できるものがありません'
          }
        >
          <PlayIcon />
          再生
        </Button>
        <Button
          variant="outline"
          disabled
          title="エンコードの登録はこれから実装されます"
        >
          エンコード
        </Button>
        <Button
          variant="destructive"
          className="ml-auto"
          disabled={!deletable}
          title={deletable ? undefined : '録画中は削除できません'}
          onClick={() => setAsked(recording)}
        >
          <TrashIcon />
          削除
        </Button>
      </div>
      <DeleteRecordingDialog
        recording={asked}
        onOpenChange={(open) => !open && setAsked(null)}
        onDelete={remove}
      />
    </>
  )
}
