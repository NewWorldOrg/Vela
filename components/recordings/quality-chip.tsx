import {
  RECORDING_QUALITY_SHAPES,
  recordingQualityShapeOf,
} from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { pillWidthFor } from '@/components/recordings/status-cell'
import { InFull } from '@/components/vela/in-full'
import { ChipDot } from '@/components/vela/status'

const UNMEASURED = '未計測'

export const RECORDING_QUALITY_PILL_WIDTH = pillWidthFor([
  UNMEASURED,
  ...Object.values(RECORDING_QUALITY_SHAPES).map((shape) => shape.label),
])

export function QualityChip({
  recording: r,
  width,
  also = [],
}: {
  recording: Recording
  width?: BadgeWidth
  also?: (string | undefined | false)[]
}) {
  const shape = recordingQualityShapeOf(r.quality.level)
  const said = [r.quality.measured && shape.saying, ...also].filter(
    (one): one is string => Boolean(one),
  )
  const pill = !r.quality.measured ? (
    <Badge variant="mute" width={width}>
      <ChipDot />
      {UNMEASURED}
    </Badge>
  ) : (
    <Badge variant={shape.variant} width={width} className="font-bold">
      <ChipDot />
      {shape.label}
    </Badge>
  )

  if (said.length === 0) {
    return pill
  }

  return <InFull says={said.join('\n')}>{pill}</InFull>
}
