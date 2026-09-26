import { shapeFor } from '@/lib/not-yet-in-this-build'
import { standingWordOf } from '@/lib/encode'
import type { Recording } from '@/repository/recordings'
import {
  NOT_ASKED_FOR_LABEL,
  NOT_ASKED_FOR_SAYING,
  NOT_ENCODED_SAYING,
  STANDING_LABEL,
  type EncodeStanding,
} from '@/repository/encode-terms'
import { Badge } from '@/components/ui/badge'
import {
  StateSay,
  stateColumnFor,
  toneOf,
} from '@/components/recordings/status-cell'
import { InFull } from '@/components/vela/in-full'
import { ChipDot } from '@/components/vela/status'

type EncodeTone = 'secondary' | 'info' | 'ok' | 'err'

const TONE: Record<EncodeStanding, EncodeTone> = {
  notEncoded: 'secondary',
  queued: 'secondary',
  running: 'info',
  completed: 'ok',
  failed: 'err',
}

const NOT_YET_KNOWN_TONE: EncodeTone = 'secondary'

const SAYING: Record<string, string> = {
  [NOT_ASKED_FOR_LABEL]: NOT_ASKED_FOR_SAYING,
  [STANDING_LABEL.notEncoded]: NOT_ENCODED_SAYING,
}

export const ENCODE_COLUMN = stateColumnFor([
  ...Object.values(STANDING_LABEL),
  NOT_ASKED_FOR_LABEL,
])

export function EncodeChip({
  recording: r,
  say = false,
  says,
}: {
  recording: Recording
  say?: boolean
  says?: string
}) {
  const tone = shapeFor(TONE, r.encode, NOT_YET_KNOWN_TONE)
  const word = says ?? standingWordOf(r.encode, r.encodeWhenRecorded)
  const drawn = say ? (
    <StateSay tone={toneOf(tone)} bold>
      {word}
    </StateSay>
  ) : (
    <Badge variant={tone} className="font-bold">
      <ChipDot />
      {word}
    </Badge>
  )

  const saying = SAYING[word]

  if (saying === undefined) {
    return drawn
  }

  return <InFull says={saying}>{drawn}</InFull>
}
