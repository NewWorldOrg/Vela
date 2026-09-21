import { TUNER_STATE_LABEL, type TunerRow } from '@/repository/tuners'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { pillWidthFor } from '@/components/recordings/status-cell'
import { InFull } from '@/components/vela/in-full'
import { ChipDot } from '@/components/vela/status'

const STATE_VARIANT = {
  ok: 'ok',
  warn: 'warn',
  faulted: 'err',
} as const

export const TUNER_STATE_PILL_WIDTH = pillWidthFor(
  Object.values(TUNER_STATE_LABEL),
)

export function TunerStateChip({
  row,
  width,
  also,
}: {
  row: TunerRow
  width?: BadgeWidth
  also?: string
}) {
  const pill = (
    <Badge
      variant={STATE_VARIANT[row.state]}
      width={width}
      className="font-bold"
    >
      <ChipDot />
      {row.stateLabel}
    </Badge>
  )

  return also ? <InFull says={also}>{pill}</InFull> : pill
}
