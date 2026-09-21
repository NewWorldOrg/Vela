import type { QualityTunerCell } from '@/repository/quality'
import type { QualityLevel } from '@/lib/quality'
import { TableCell } from '@/components/ui/table'
import { StatusCell } from '@/components/recordings/status-cell'
import {
  QUALITY_LEVEL_PILL_WIDTH,
  QualityChip,
} from '@/components/quality/signal-quality-chip'
import { InFull } from '@/components/vela/in-full'

export function QualityHealthCell({ cell }: { cell: QualityTunerCell }) {
  return (
    <TableCell className="align-top whitespace-nowrap">
      <StatusCell>
        {cell.level !== undefined && (
          <Reading level={cell.level} sub={cell.sub} />
        )}
        {cell.value !== undefined && (
          <span className="ml-2.5 font-code text-ui font-medium tabular-nums">
            {cell.value}
            {cell.unit && (
              <em className="ml-0.5 font-sans text-note text-ink-3 not-italic">
                {cell.unit}
              </em>
            )}
          </span>
        )}
      </StatusCell>
    </TableCell>
  )
}

function Reading({ level, sub }: { level: QualityLevel; sub?: string }) {
  const pill = <QualityChip level={level} width={QUALITY_LEVEL_PILL_WIDTH} />

  return sub ? (
    <InFull says={sub}>
      <span className="inline-flex">{pill}</span>
    </InFull>
  ) : (
    pill
  )
}
