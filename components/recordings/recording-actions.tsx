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
import { useToast } from '@/components/vela/toast'
import { useOnAPhone } from '@/hooks/usePhone'
import {
  holdDeletion,
  releaseDeletion,
} from '@/components/recordings/held-deletions'
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
  laid = 'page',
}: {
  /** In the page, in the column beside the programme on a wide window, or in the face a phone held on its side opens at the picture's right, where the buttons stand one under another. */
  laid?: 'page' | 'column' | 'face'
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

  const say = useToast()
  const phone = useOnAPhone()

  const deleteWhenTheToastLeaves = (): void => {
    const { id } = recording

    holdDeletion(id)
    router.push('/library')
    say({
      text: '録画を削除しました',
      action: { label: '元に戻す', onPress: () => releaseDeletion(id) },
      onExpire: () => {
        void onDelete(id).then((result) => {
          releaseDeletion(id)
          router.refresh()

          if (result.state === 'rejected') {
            say({ text: result.message })
          }
        })
      },
    })
  }

  const remove = async (id: string): Promise<RecordingDiscarded> => {
    const result = await onDelete(id)

    if (result.state === 'ok') {
      router.push('/library')
    }

    return result
  }

  const asking = (
    <DeleteRecordingDialog
      recording={asked}
      onOpenChange={(open) => !open && setAsked(null)}
      onDelete={remove}
    />
  )

  if (laid === 'column') {
    return (
      <>
        <div
          data-slot="recording-actions"
          className="flex w-[calc(236rem/16)] flex-col items-stretch gap-2.5 max-[900px]:w-full max-[900px]:max-w-[calc(360rem/16)] upright:grid upright:max-w-none upright:grid-cols-2 upright:gap-[calc(9rem/16)] upright:[&_[data-variant=ghost]]:bg-surface-2 upright:[&_[data-variant=ghost]]:text-ink"
        >
          {plan && (
            <ExternalPlayerOpener
              recording={recording}
              plan={plan}
              onTakeTicket={onTakeTicket}
              wide
            />
          )}
          {encodes(recording) && (
            <EncodeButton
              recording={recording}
              choices={encodeChoices}
              onQueue={onQueueEncode}
              quiet
            />
          )}
          {redrawsThumbnail(recording) && (
            <ThumbnailButton
              recording={recording}
              onRemake={onRemakeThumbnail}
              quiet
            />
          )}
          <Button
            variant="danger"
            disabled={!deletable}
            title={deletable ? undefined : '録画中のため、削除できません。'}
            onClick={() =>
              phone ? deleteWhenTheToastLeaves() : setAsked(recording)
            }
          >
            削除
          </Button>
          <UnfinishedDeletionChip recording={recording} />
        </div>
        {asking}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-[calc(9rem/16)]">
        <ActionRow
          className={
            laid === 'face'
              ? 'w-full grid-flow-row grid-cols-1 [&>div]:items-stretch'
              : 'max-[900px]:w-full max-[900px]:grid-flow-row max-[900px]:grid-cols-2 max-[600px]:grid-cols-1 upright:grid-cols-2 upright:[&>[data-slot=encode-action]]:order-2 upright:[&>[data-slot=thumbnail-action]]:order-3 [&>div]:items-stretch'
          }
        >
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
            variant="danger"
            disabled={!deletable}
            title={deletable ? undefined : '録画中のため、削除できません。'}
            onClick={() =>
              phone ? deleteWhenTheToastLeaves() : setAsked(recording)
            }
            className="upright:order-4"
          >
            <TrashIcon />
            削除
          </Button>
        </ActionRow>
        <span className="ml-auto text-right">
          <UnfinishedDeletionChip recording={recording} />
        </span>
      </div>
      {asking}
    </>
  )
}
