import { FAILURE_CLASSES } from '@/repository/scan-failures'
import { FailureMark } from '@/components/scan/failure-mark'

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
