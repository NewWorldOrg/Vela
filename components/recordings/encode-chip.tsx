import { shapeFor } from '@/lib/not-yet-in-this-build'
import { standingWordOf } from '@/lib/encode'
import type { Recording } from '@/repository/recordings'
import type { EncodeStanding } from '@/repository/encode-terms'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
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

export function EncodeChip({
  recording: r,
  width,
  says,
}: {
  recording: Recording
  width?: BadgeWidth
  says?: string
}) {
  const tone = shapeFor(TONE, r.encode, NOT_YET_KNOWN_TONE)
  const word = says ?? standingWordOf(r.encode, r.encodeWhenRecorded)

  return (
    <Badge variant={tone} width={width} className="font-bold">
      <ChipDot />
      {word}
    </Badge>
  )
}
