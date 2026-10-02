import {
  RECORDING_QUALITY_SHAPES,
  recordingQualityShapeOf,
} from '@/lib/recordings'
import { LEFT_SCRAMBLED_TERM } from '@/lib/state-terms'
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
  LEFT_SCRAMBLED_TERM.label,
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
  const measured = r.quality.measured
  const scrambled = r.leftScrambled === true
  const graded = measured ? shape.label : UNMEASURED
  const said = [
    ...(scrambled
      ? [LEFT_SCRAMBLED_TERM.explanation, (measured && shape.saying) || graded]
      : [measured && shape.saying]),
    ...also,
  ].filter((one): one is string => Boolean(one))
  const variant = scrambled ? 'err' : measured ? shape.variant : 'mute'
  const word = scrambled ? LEFT_SCRAMBLED_TERM.label : graded
  const bold = scrambled || measured
  const drawn = say ? (
    <StateSay tone={toneOf(variant)} bold={bold}>
      {word}
    </StateSay>
  ) : (
    <Badge variant={variant} className={bold ? 'font-bold' : undefined}>
      <ChipDot />
      {word}
    </Badge>
  )

  if (said.length === 0) {
    return drawn
  }

  return <InFull says={said.join('\n')}>{drawn}</InFull>
}
