import type { FailureClass } from '@/repository/scan-failures'
import { cn } from '@/lib/utils'

export function FailureMark({
  failure,
  className,
}: {
  failure: FailureClass
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-[calc(19rem/16)] shrink-0 items-center justify-center rounded-full bg-surface-2 text-cap leading-none font-semibold text-ink-2 tabular-nums',
        className,
      )}
    >
      {failure.no}
    </span>
  )
}
