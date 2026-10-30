import { ListIcon } from '@/components/vela/icons'
import { TableCell } from '@/components/ui/table'
import { cardPlace } from '@/components/ui/table-cards'

export function OriginCell({
  origin,
  ruleName,
}: {
  origin: string
  ruleName?: string
}) {
  return (
    <TableCell
      {...cardPlace('field', '由来')}
      className="align-top whitespace-normal"
    >
      {ruleName ? (
        <span className="flex items-start gap-1.5 text-ui text-ink-2">
          <ListIcon className="mt-[calc(4.5rem/16)] size-3 shrink-0" />
          <span className="min-w-0 text-pretty wrap-anywhere">{ruleName}</span>
        </span>
      ) : (
        <span className="text-ink-2">{origin}</span>
      )}
    </TableCell>
  )
}
