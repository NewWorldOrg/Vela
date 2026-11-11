'use client'

import {
  recordingHandover,
  recordingHandoverChoices,
} from '@/lib/external-player'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import {
  type OpenLook,
  HandoverMenu,
} from '@/components/recordings/handover-menu'

export function ExternalPlayerOpener({
  recording,
  plan,
  onTakeTicket,
  tone,
  look,
}: {
  recording: { id: string; title: string; sizeBytes?: number | null }
  plan: Pick<PlaybackPlan, 'source' | 'alternative' | 'externalPlayerSources'>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  tone?: 'page' | 'player'
  look?: OpenLook
}) {
  const choices = recordingHandoverChoices(
    recording.id,
    onTakeTicket,
    plan,
    recording.sizeBytes,
    recording.title,
  )

  return (
    <HandoverMenu
      choices={choices}
      only={recordingHandover(
        recording.id,
        onTakeTicket,
        undefined,
        recording.title,
      )}
      tone={tone}
      look={look}
    />
  )
}
