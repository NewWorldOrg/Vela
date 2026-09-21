import type { QualityLevel } from '@/lib/quality'
import { QUALITY_PILL_LABEL } from '@/lib/quality'
import { HEALTHY } from '@/repository/quality'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { pillWidthFor } from '@/components/recordings/status-cell'
import { CloseIcon } from '@/components/vela/icons'
import { ChipDot } from '@/components/vela/status'

export const QUALITY_LEVEL_PILL_WIDTH = pillWidthFor([
  ...Object.values(QUALITY_PILL_LABEL),
  HEALTHY,
])

export function QualityChip({
  level,
  width,
  children,
}: {
  level: QualityLevel
  width?: BadgeWidth
  children?: React.ReactNode
}) {
  const label = children ?? QUALITY_PILL_LABEL[level]

  if (level === 'good' || level === 'warn' || level === 'bad') {
    const variant = level === 'good' ? 'ok' : level === 'warn' ? 'warn' : 'err'

    return (
      <Badge variant={variant} width={width} className="font-bold">
        <ChipDot />
        {label}
      </Badge>
    )
  }

  if (level === 'nodata') {
    return (
      <Badge variant="mute" width={width}>
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full border border-ink-3"
        />
        {label}
      </Badge>
    )
  }

  if (level === 'unsupported') {
    return (
      <Badge variant="mute" width={width}>
        <span aria-hidden="true" className="h-3 w-px rotate-[30deg] bg-ink-3" />
        {label}
      </Badge>
    )
  }

  if (level === 'unreachable') {
    return (
      <Badge variant="mute" width={width}>
        <CloseIcon />
        {label}
      </Badge>
    )
  }

  return (
    <Badge variant="mute" width={width}>
      {label}
    </Badge>
  )
}
