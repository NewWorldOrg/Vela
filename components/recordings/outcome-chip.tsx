import type { Recording, RecordingOutcome } from '@/repository/recordings'
import { RECORDING_OUTCOME_TERMS } from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

const VARIANT: Record<RecordingOutcome, 'info' | 'ok' | 'warn' | 'err'> = {
  recording: 'info',
  complete: 'ok',
  truncated: 'warn',
  failed: 'err',
}

export function OutcomeChip({ recording: r }: { recording: Recording }) {
  const term = RECORDING_OUTCOME_TERMS[r.outcome]

  return (
    <TermTip term={term}>
      <Badge variant={VARIANT[r.outcome]} className="font-bold">
        <ChipDot />
        {term.label}
      </Badge>
    </TermTip>
  )
}
