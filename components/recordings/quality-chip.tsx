import {
  RECORDING_QUALITY_SHAPES,
  recordingQualityShapeOf,
} from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import {
  StateSay,
  stateColumnFor,
  toneOf,
} from '@/components/recordings/status-cell'
import { InFull } from '@/components/vela/in-full'
import { ChipDot } from '@/components/vela/status'

const UNMEASURED = '未計測'

export const RECORDING_QUALITY_COLUMN = stateColumnFor([
  UNMEASURED,
  ...Object.values(RECORDING_QUALITY_SHAPES).map((shape) => shape.label),
])

export function QualityChip({
  recording: r,
  say = false,
  also = [],
}: {
  recording: Recording
  say?: boolean
  also?: (string | undefined | false)[]
}) {
  const shape = recordingQualityShapeOf(r.quality.level)
  const said = [r.quality.measured && shape.saying, ...also].filter(
    (one): one is string => Boolean(one),
  )
  const measured = r.quality.measured
  const variant = measured ? shape.variant : 'mute'
  const word = measured ? shape.label : UNMEASURED
  const drawn = say ? (
    <StateSay tone={toneOf(variant)} bold={measured}>
      {word}
    </StateSay>
  ) : (
    <Badge variant={variant} className={measured ? 'font-bold' : undefined}>
      <ChipDot />
      {word}
    </Badge>
  )

  if (said.length === 0) {
    return drawn
  }

  return <InFull says={said.join('\n')}>{drawn}</InFull>
}
