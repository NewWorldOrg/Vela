import type { FailureClass } from '@/repository/scan-failures'
import { cn } from '@/lib/utils'
import { FAILURE_CLASSES } from '@/repository/scan-failures'

/**
 * The four ways a scan stops, each with a colour of its own. Collapsing them
 * into one error is what makes an aerial fault indistinguishable from a
 * descrambling fault, so the number and the colour travel together everywhere
 * a failure is named.
 */
const MARK_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: 'bg-coral-soft text-coral',
  2: 'bg-lemon-soft text-lemon',
  3: 'bg-sky-soft text-sky',
  4: 'bg-brand-soft text-brand',
}

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
        'inline-flex size-[19px] shrink-0 items-center justify-center rounded-full font-code text-cap leading-none font-medium',
        MARK_CLASS[failure.no],
        className,
      )}
    >
      {failure.no}
    </span>
  )
}

/** The class named in full: mark and label, and a detail where the caller has one. */
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
        <b className="block text-ui leading-[1.55] font-bold text-ink">
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

/** The four, listed together, so the numbers mean something before they appear. */
export function FailureLegend() {
  return (
    <div className="mb-[13px] grid gap-[9px] rounded-xl bg-surface px-4 py-3.5 sm:grid-cols-2 min-[1020px]:grid-cols-4">
      {FAILURE_CLASSES.map((failure) => (
        <div key={failure.no} className="flex items-start gap-[9px]">
          <FailureMark failure={failure} className="mt-0.5" />
          <span className="min-w-0">
            <b className="block text-ui leading-[1.5] font-bold">
              {failure.label}
            </b>
          </span>
        </div>
      ))}
    </div>
  )
}
