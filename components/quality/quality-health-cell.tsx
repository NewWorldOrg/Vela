import { cn } from '@/lib/utils'
import type { QualityTunerCell } from '@/repository/quality'
import { TableCell } from '@/components/ui/table'
import { QualityChip } from '@/components/quality/signal-quality-chip'

export function QualityHealthCell({ cell }: { cell: QualityTunerCell }) {
  const hasReading = cell.value !== undefined || cell.layers !== undefined

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
      {cell.layers?.map((layer) => (
        <span key={layer.layer} className="block font-code text-note">
          <i className="mr-1.5 text-ink-3 not-italic">{layer.layer}</i>
          {layer.value}
        </span>
      ))}
      {cell.level && (
        <span className={cn('block', hasReading && 'mt-1')}>
          <QualityChip level={cell.level} />
        </span>
      )}
      {cell.sub && (
        <span
          className={cn(
            'mt-1 block font-code text-note text-ink-3',
            cell.stale && 'text-lemon',
          )}
        >
          {cell.sub}
        </span>
      )}
    </TableCell>
  )
}
