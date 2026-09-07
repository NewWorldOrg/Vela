import type { QualityLevel } from '@/lib/quality'
import { QUALITY_LEVEL_LABEL } from '@/lib/quality'
import { Badge } from '@/components/ui/badge'
import { CloseIcon } from '@/components/vela/icons'
import { ChipDot } from '@/components/vela/status'

export function QualityChip({
  level,
  children,
}: {
  level: QualityLevel
  children?: React.ReactNode
}) {
  const label = children ?? QUALITY_LEVEL_LABEL[level]

  if (level === 'good' || level === 'warn' || level === 'bad') {
    const variant = level === 'good' ? 'ok' : level === 'warn' ? 'warn' : 'err'

    return (
      <Badge variant={variant} className="font-bold">
        <ChipDot />
        {label}
      </Badge>
    )
  }

  if (level === 'nodata') {
    return (
      <Badge variant="mute">
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
      <Badge variant="mute">
        <span aria-hidden="true" className="h-3 w-px rotate-[30deg] bg-ink-3" />
        {label}
      </Badge>
    )
  }

  if (level === 'unreachable') {
    return (
      <Badge variant="outline">
        <CloseIcon />
        {label}
      </Badge>
    )
  }

  return <Badge variant="mute">{label}</Badge>
}
