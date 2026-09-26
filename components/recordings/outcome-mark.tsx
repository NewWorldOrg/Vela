import {
  OutcomeFailedIcon,
  OutcomeTruncatedIcon,
  SuccessIcon,
} from '@/components/vela/icons'

const OUTCOME_MARK = {
  complete: SuccessIcon,
  truncated: OutcomeTruncatedIcon,
  failed: OutcomeFailedIcon,
} as const

export function OutcomeMark({
  outcome,
}: {
  outcome: 'complete' | 'truncated' | 'failed'
}) {
  const Mark = OUTCOME_MARK[outcome]

  return <Mark className="size-[calc(26rem/16)] shrink-0 text-ink" />
}
