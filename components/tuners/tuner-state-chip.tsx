import { TUNER_STATE_LABEL, type TunerRow } from '@/repository/tuners'
import { Badge } from '@/components/ui/badge'
import {
  StateSay,
  stateColumnFor,
  toneOf,
} from '@/components/recordings/status-cell'
import { InFull } from '@/components/vela/in-full'
import { ChipDot } from '@/components/vela/status'

const STATE_VARIANT = {
  ok: 'ok',
  warn: 'warn',
  faulted: 'err',
} as const

export const TUNER_STATE_COLUMN = stateColumnFor(
  Object.values(TUNER_STATE_LABEL),
)

export function TunerStateChip({
  row,
  say = false,
  also,
}: {
  row: TunerRow
  say?: boolean
  also?: string
}) {
  const variant = STATE_VARIANT[row.state]
  const drawn = say ? (
    <StateSay tone={toneOf(variant)} bold>
      {row.stateLabel}
    </StateSay>
  ) : (
    <Badge variant={variant} className="font-bold">
      <ChipDot />
      {row.stateLabel}
    </Badge>
  )

  return also ? <InFull says={also}>{drawn}</InFull> : drawn
}
