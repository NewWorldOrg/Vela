'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type {
  Recording,
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type { EncodeChoices } from '@/repository/encode'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import { Button } from '@/components/ui/button'
import { ActionRow } from '@/components/vela/action-row'
import { TrashIcon } from '@/components/vela/icons'
import { ExternalPlayerOpener } from '@/components/recordings/external-player'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import { UnfinishedDeletionChip } from '@/components/recordings/unfinished-deletion-chip'
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
  plan,
}: {
  recording: Recording
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onRemakeThumbnail: (id: string) => Promise<ThumbnailWrite>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  onQueueEncode: QueueEncode
  encodeChoices: EncodeChoices
  plan?: PlaybackPlan
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
      <div className="flex flex-wrap items-center gap-[calc(9rem/16)]">
        <ActionRow className="max-[700px]:w-full max-[700px]:grid-flow-row">
          {plan && (
            <ExternalPlayerOpener
              recording={recording}
              plan={plan}
              onTakeTicket={onTakeTicket}
            />
          )}
          {redrawsThumbnail(recording) && (
            <ThumbnailButton
              recording={recording}
              onRemake={onRemakeThumbnail}
            />
          )}
          {encodes(recording) && (
            <EncodeButton
              recording={recording}
              choices={encodeChoices}
              onQueue={onQueueEncode}
            />
          )}
          <Button
            variant="remove"
            disabled={!deletable}
            title={deletable ? undefined : '録画中は削除できません'}
            onClick={() => setAsked(recording)}
          >
            <TrashIcon />
            削除
          </Button>
        </ActionRow>
        <span className="ml-auto text-right">
          <UnfinishedDeletionChip recording={recording} />
        </span>
      </div>
      <DeleteRecordingDialog
        recording={asked}
        onOpenChange={(open) => !open && setAsked(null)}
        onDelete={remove}
      />
    </>
  )
}
