import type { ConflictEntry } from '@/repository/reservations'
import { WarningIcon } from '@/components/vela/icons'
import { ConflictEntries } from '@/components/reservations/conflict-entries'
import { cn } from '@/lib/utils'

export const DISPLACED = '次の予約が競合になりました。'

export function DisplacedNotice({
  entries,
  className,
}: {
  entries: readonly ConflictEntry[] | undefined
  className?: string
}) {
  if (!entries || entries.length === 0) {
    return null
  }

  return (
    <div
      data-slot="displaced"
      role="status"
      className={cn(
        'rounded-lg bg-surface px-4 py-3.5 whitespace-normal',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-ui font-bold text-coral">
        <WarningIcon className="size-4 shrink-0" />
        {DISPLACED}
      </div>
      <ConflictEntries entries={entries} className="mt-2.5" />
    </div>
  )
}
