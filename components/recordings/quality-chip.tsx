import { recordingQualityShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function QualityChip({ recording: r }: { recording: Recording }) {
  if (!r.quality.measured) {
    return <Badge variant="outline">未計測</Badge>
  }

  const shape = recordingQualityShapeOf(r.quality.level)

  return (
    <Badge variant={shape.variant} className="font-bold">
      <ChipDot />
      {shape.label}
    </Badge>
  )
}
