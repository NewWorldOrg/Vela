'use client'

import { useState } from 'react'

import {
  appSays,
  recordingHandover,
  recordingHandoverChoices,
  type Handover,
  type HandoverChoice,
} from '@/lib/external-player'
import { usePlayerApps } from '@/hooks/usePlayerApps'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import { Spinner } from '@/components/vela/spinner'
import { Button } from '@/components/ui/button'
import { CopyIcon, DevicePlayerIcon } from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'
import {
  useHandingOver,
  WHAT_IS_HANDED,
  COPY_THE_URL,
} from '@/components/recordings/handing-over'
import { WhatHappened } from '@/components/recordings/what-happened'

/** The same choices as the menu, laid out in a face rather than dropped from a button: what is handed, then a button for each player and for the URL. */
function HandoverList({
  choices,
  only,
}: {
  choices: HandoverChoice[]
  only: Handover
}) {
  const apps = usePlayerApps()
  const { taking, said, open, copy } = useHandingOver()
  const [picked, setPicked] = useState<string | undefined>(choices[0]?.source)
  const chosen = choices.find((one) => one.source === picked) ?? choices[0]
  const handover = chosen?.handover ?? only

  return (
    <div data-slot="handover-list" className="flex flex-col gap-3 py-3">
      {chosen && choices.length > 1 && (
        <SegmentedControl
          label={WHAT_IS_HANDED}
          options={choices.map((choice) => ({
            value: choice.source,
            label: choice.size
              ? `${choice.label} ${choice.size}`
              : choice.label,
          }))}
          value={chosen.source}
          onValueChange={setPicked}
          className="w-full [&>*]:flex-1"
        />
      )}
      {apps.map((app) => (
        <Button
          key={app}
          variant="tone"
          aria-disabled={taking}
          onClick={() => void open(app, handover)}
        >
          <DevicePlayerIcon />
          {appSays(app)}
        </Button>
      ))}
      <Button
        variant="tone"
        aria-disabled={taking}
        onClick={() => void copy(handover)}
      >
        {taking ? <Spinner size="control" /> : <CopyIcon />}
        {COPY_THE_URL}
      </Button>
      <WhatHappened said={said} tone="page" />
    </div>
  )
}

/** The recording's ways out to another player, as a face's list: what is handed, each player, and the URL. */
export function RecordingHandoverList({
  recording,
  plan,
  onTakeTicket,
}: {
  recording: { id: string; title: string; sizeBytes?: number | null }
  plan: Pick<PlaybackPlan, 'source' | 'alternative' | 'externalPlayerSources'>
  onTakeTicket: (id: string) => Promise<TicketWrite>
}) {
  return (
    <HandoverList
      choices={recordingHandoverChoices(
        recording.id,
        onTakeTicket,
        plan,
        recording.sizeBytes,
        recording.title,
      )}
      only={recordingHandover(
        recording.id,
        onTakeTicket,
        undefined,
        recording.title,
      )}
    />
  )
}
