import type { CardReaderRow } from '@/repository/tuners'
import { HardwareLine } from '@/components/tuners/hardware-line'

export function CardReaderLine({ row }: { row: CardReaderRow }) {
  return (
    <HardwareLine
      id={row.id}
      title={row.title}
      sub={row.sub}
      status={row.status}
    />
  )
}
