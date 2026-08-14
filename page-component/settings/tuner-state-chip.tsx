import type { TunerRow } from '@/repository/tuners'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

const STATE_VARIANT = {
  ok: 'ok',
  warn: 'warn',
  faulted: 'err',
} as const

export function TunerStateChip({ row }: { row: TunerRow }) {
  return (
    <Badge variant={STATE_VARIANT[row.state]} className="font-bold">
      <ChipDot />
      {row.stateLabel}
    </Badge>
  )
}
