import type { ConflictEntry } from '@/repository/reservations'
import { cn } from '@/lib/utils'

export function ConflictEntries({
  entries,
  className,
}: {
  entries: readonly ConflictEntry[]
  className?: string
}) {
  return (
    <div className={cn(className)}>
      {entries.map((entry, at) => (
        <div
          key={`${entry.title}-${at}`}
          data-slot="conflict-entry"
          className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-hair py-2 text-sub text-ink first:border-t-0"
        >
          <span
            data-slot="conflict-entry-title"
            className="min-w-0 flex-1 font-semibold"
          >
            {entry.title}
          </span>
          <span className="font-code text-ink-2">{entry.meta}</span>
          <span className="text-ink-2">{entry.ruleName ?? entry.origin}</span>
        </div>
      ))}
    </div>
  )
}
