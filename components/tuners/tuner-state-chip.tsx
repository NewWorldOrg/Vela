import type { TunerRow } from '@/repository/tuners'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

const STATE_VARIANT = {
  ok: 'ok',
  warn: 'warn',
  faulted: 'err',
} as const

export function TunerStateChip({
  row,
  width,
}: {
  row: TunerRow
  width?: BadgeWidth
}) {
  return (
    <Badge
      variant={STATE_VARIANT[row.state]}
      width={width}
      className="font-bold"
    >
      <ChipDot />
      {row.stateLabel}
    </Badge>
  )
}
