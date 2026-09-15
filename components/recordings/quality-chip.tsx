import { cn } from '@/lib/utils'
import { recordingQualityShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function QualityChip({
  recording: r,
  withDetail,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  withDetail?: boolean
  subTone?: string
}) {
  if (!r.quality.measured) {
    return (
      <>
        <Badge variant="outline">未計測</Badge>
        {withDetail && r.quality.detail && (
          <span
            className={cn(
              'mt-[3px] block text-[10.5px] leading-relaxed',
              subTone,
            )}
          >
            {r.quality.detail}
          </span>
        )}
      </>
    )
  }
  const shape = recordingQualityShapeOf(r.quality.level)

  return (
    <>
      <Badge variant={shape.variant} className="font-bold">
        <ChipDot />
        {shape.label}
      </Badge>
      {withDetail && r.quality.detail && (
        <span
          className={cn(
            'mt-[3px] block font-code text-[10.5px] leading-relaxed',
            subTone,
          )}
        >
          {r.quality.detail}
        </span>
      )}
    </>
  )
}
