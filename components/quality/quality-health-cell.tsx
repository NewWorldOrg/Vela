import { cn } from '@/lib/utils'
import type { QualityTunerCell } from '@/repository/quality'
import { TableCell } from '@/components/ui/table'
import { QualityChip } from '@/components/quality/signal-quality-chip'

export function QualityHealthCell({ cell }: { cell: QualityTunerCell }) {
  return (
    <TableCell className="align-top whitespace-normal">
      {cell.value !== undefined && (
        <span className="block font-code text-ui font-medium tabular-nums">
          {cell.value}
          {cell.unit && (
            <em className="ml-0.5 font-sans text-note text-ink-3 not-italic">
              {cell.unit}
            </em>
          )}
        </span>
      )}
      {cell.level && (
        <span className={cn('block', cell.value !== undefined && 'mt-1')}>
          <QualityChip level={cell.level} />
        </span>
      )}
      {cell.sub && (
        <span className="mt-1 block font-code text-note text-ink-3">
          {cell.sub}
        </span>
      )}
    </TableCell>
  )
}
