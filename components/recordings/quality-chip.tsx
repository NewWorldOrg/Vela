import { cn } from '@/lib/utils'
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
  const variant =
    r.quality.level === 'good'
      ? 'ok'
      : r.quality.level === 'warning'
        ? 'warn'
        : 'err'
  const label =
    r.quality.level === 'good'
      ? '良好'
      : r.quality.level === 'warning'
        ? '警告水準'
        : '視聴不可の恐れ'
  return (
    <>
      <Badge variant={variant} className="font-bold">
        <ChipDot />
        {label}
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
