import { unfinishedDeletionShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function UnfinishedDeletionChip({
  recording,
  width,
}: {
  recording: Recording
  width?: BadgeWidth
}) {
  const shape = unfinishedDeletionShapeOf(recording)

  if (!shape) {
    return null
  }

  return (
    <>
      <Badge variant="warn" width={width} className="font-bold">
        <ChipDot />
        {shape.label}
      </Badge>
      {shape.detail && (
        <span className="block text-[10.5px] leading-relaxed text-ink-3">
          {shape.detail}
        </span>
      )}
    </>
  )
}
