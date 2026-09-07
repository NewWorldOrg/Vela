'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type {
  Recording,
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type { EncodeChoices } from '@/repository/encode'
import type { TicketWrite } from '@/repository/videos'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@/components/vela/icons'
import { OpenExternally } from '@/components/recordings/external-player'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import {
  EncodeButton,
  encodes,
  type QueueEncode,
} from '@/components/recordings/encode-button'
import {
  redrawsThumbnail,
  ThumbnailButton,
} from '@/components/recordings/thumbnail-button'

export function RecordingActions({
  recording,
  onDelete,
  onRemakeThumbnail,
  onTakeTicket,
  onQueueEncode,
  encodeChoices,
  plays,
}: {
  recording: Recording
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onRemakeThumbnail: (id: string) => Promise<ThumbnailWrite>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  onQueueEncode: QueueEncode
  encodeChoices: EncodeChoices
  plays?: boolean
}) {
  const deletable = recording.outcome !== 'recording'
  const router = useRouter()
  const [asked, setAsked] = useState<Recording | null>(null)

  const remove = async (id: string): Promise<RecordingDiscarded> => {
    const result = await onDelete(id)

    if (result.state === 'ok') {
      router.push('/library')
    }

    return result
  }

  return (
    <>
      <div className="flex flex-wrap items-start gap-[9px]">
        {plays && (
          <OpenExternally id={recording.id} onTakeTicket={onTakeTicket} />
        )}
        {redrawsThumbnail(recording) && (
          <ThumbnailButton recording={recording} onRemake={onRemakeThumbnail} />
        )}
        {encodes(recording) && (
          <EncodeButton
            recording={recording}
            choices={encodeChoices}
            onQueue={onQueueEncode}
          />
        )}
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
