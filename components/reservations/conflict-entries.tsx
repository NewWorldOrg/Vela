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
    <div className={cn('space-y-1.5', className)}>
      {entries.map((entry, at) => (
        <div
          key={`${entry.title}-${at}`}
          className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sub"
        >
          <span className="min-w-0 flex-1 font-medium">{entry.title}</span>
          <span className="font-code text-ink-2">{entry.meta}</span>
          <span className="text-ink-3">{entry.ruleName ?? entry.origin}</span>
        </div>
      ))}
    </div>
  )
}
