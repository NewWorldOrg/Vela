import { recordingQualityShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function QualityChip({
  recording: r,
  width,
}: {
  recording: Recording
  width?: BadgeWidth
}) {
  if (!r.quality.measured) {
    return (
      <Badge variant="outline" width={width}>
        未計測
      </Badge>
    )
  }

  const shape = recordingQualityShapeOf(r.quality.level)

  return (
    <Badge variant={shape.variant} width={width} className="font-bold">
      <ChipDot />
      {shape.label}
    </Badge>
  )
}
