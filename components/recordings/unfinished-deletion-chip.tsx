import { cn } from '@/lib/utils'
import { unfinishedDeletionShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function UnfinishedDeletionChip({
  recording,
  className,
}: {
  recording: Recording
  className?: string
}) {
  const shape = unfinishedDeletionShapeOf(recording)

  if (!shape) {
    return null
  }

  return (
    <>
      <Badge variant="warn" className={cn('mt-[3px] font-bold', className)}>
        <ChipDot />
        {shape.label}
      </Badge>
      {shape.detail && (
        <span className="mt-[3px] block text-[10.5px] leading-relaxed text-ink-3">
          {shape.detail}
        </span>
      )}
    </>
  )
}
