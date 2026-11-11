import type { FailureClass } from '@/repository/scan-failures'
import { FailureMark } from '@/components/scan/failure-mark'

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
