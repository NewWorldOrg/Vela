import { unfinishedDeletionShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function UnfinishedDeletionChip({
  recording,
}: {
  recording: Recording
}) {
  const shape = unfinishedDeletionShapeOf(recording)

  if (!shape) {
    return null
  }

  return (
    <>
      <Badge variant="warn" className="font-bold">
        <ChipDot />
        {shape.label}
      </Badge>
      {shape.detail && (
        <span className="mt-1 block text-micro leading-relaxed text-ink-2">
          {shape.detail}
        </span>
      )}
    </>
  )
}
