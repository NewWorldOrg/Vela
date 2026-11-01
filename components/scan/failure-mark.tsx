import type { FailureClass } from '@/repository/scan-failures'
import { cn } from '@/lib/utils'
import { FAILURE_CLASSES } from '@/repository/scan-failures'

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

export function FailureLabel({
  failure,
  children,
}: {
  failure: FailureClass
  children?: React.ReactNode
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <FailureMark failure={failure} />
      <span className="min-w-0">
        <b className="block text-ui leading-[1.55] font-semibold text-ink">
          {failure.label}
        </b>
        {children && (
          <span className="block text-note leading-[1.55] text-ink-2">
            {children}
          </span>
        )}
      </span>
    </span>
  )
}

export function FailureLegend() {
  return (
    <div className="mb-3 grid gap-2.5 rounded-lg bg-surface px-4 py-3.5 sm:grid-cols-2 min-[1020px]:grid-cols-4 [&_[aria-hidden]]:bg-surface-3">
      {FAILURE_CLASSES.map((failure) => (
        <div key={failure.no} className="flex items-start gap-[calc(9rem/16)]">
          <FailureMark failure={failure} className="mt-0.5" />
          <span className="min-w-0">
            <b className="block text-ui leading-[1.5] font-semibold">
              {failure.label}
            </b>
          </span>
        </div>
      ))}
    </div>
  )
}
