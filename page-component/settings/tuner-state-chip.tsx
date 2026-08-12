import type { TunerRow } from '@/repository/tuners'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function TunerStateChip({ row }: { row: TunerRow }) {
  if (row.state === 'faulted') {
    return (
      <Badge variant="err" className="font-bold">
        <ChipDot />
        {row.stateLabel}
      </Badge>
    )
  }

  if (row.state === 'ok') {
    return (
      <Badge variant="ok" className="font-bold">
        <ChipDot />
        {row.stateLabel}
      </Badge>
    )
  }

  return <Badge variant="mute">{row.stateLabel}</Badge>
}
