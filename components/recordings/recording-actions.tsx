'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type {
  Recording,
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type { TicketWrite } from '@/repository/videos'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@/components/vela/icons'
import { OpenExternally } from '@/components/recordings/external-player'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import {
  redrawsThumbnail,
  ThumbnailButton,
} from '@/components/recordings/thumbnail-button'

/**
 * What can be done with this recording, as against what can be done with the
 * picture — which is on the bar, over the picture.
 *
 * `再生` used to stand here, greyed out, directly under a player that plays.
 * `エンコード` stood beside it, greyed out, under a panel that has never had
 * anything in it because the API carries no encoding state at all. Neither was
 * a control anyone could press, and a control that is always refused is not
 * drawn (v3.31, v3.35).
 */
export function RecordingActions({
  recording,
  onDelete,
  onRemakeThumbnail,
  onTakeTicket,
  /** Whether a recording can be handed to something outside the browser. */
  plays,
}: {
  recording: Recording
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onRemakeThumbnail: (id: string) => Promise<ThumbnailWrite>
  onTakeTicket: (id: string) => Promise<TicketWrite>
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
      <div className="flex flex-wrap items-start gap-[9px]">
        {plays && (
          <OpenExternally id={recording.id} onTakeTicket={onTakeTicket} />
        )}
        {redrawsThumbnail(recording) && (
          <ThumbnailButton recording={recording} onRemake={onRemakeThumbnail} />
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
