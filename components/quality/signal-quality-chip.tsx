import type { QualityLevel } from '@/lib/quality'
import { QUALITY_PILL_LABEL } from '@/lib/quality'
import { HEALTHY } from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import {
  StateSay,
  stateColumnFor,
  toneOf,
} from '@/components/recordings/status-cell'
import { CloseIcon } from '@/components/vela/icons'
import { ChipDot } from '@/components/vela/status'

export const QUALITY_LEVEL_COLUMN = stateColumnFor([
  ...Object.values(QUALITY_PILL_LABEL),
  HEALTHY,
])

export function QualityChip({
  level,
  say = false,
  children,
}: {
  level: QualityLevel
  say?: boolean
  children?: React.ReactNode
}) {
  const label = children ?? QUALITY_PILL_LABEL[level]

  if (level === 'good' || level === 'warn' || level === 'bad') {
    const variant = level === 'good' ? 'ok' : level === 'warn' ? 'warn' : 'err'

    if (say) {
      return (
        <StateSay tone={toneOf(variant)} bold>
          {label}
        </StateSay>
      )
    }

    return (
      <Badge variant={variant} className="font-bold">
        <ChipDot />
        {label}
      </Badge>
    )
  }

  if (say) {
    return (
      <StateSay tone="mute" dot={level === 'nodata'}>
        {label}
      </StateSay>
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
      <Badge variant="mute">
        <CloseIcon />
        {label}
      </Badge>
    )
  }

  return <Badge variant="mute">{label}</Badge>
}
