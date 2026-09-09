import type { Recording, RecordingOutcome } from '@/repository/recordings'
import {
  NOT_YET_IN_THIS_BUILD_TERM,
  RECORDING_OUTCOME_TERMS,
} from '@/lib/state-terms'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { Badge } from '@/components/ui/badge'
import { RecordingInProgressChip } from '@/components/vela/recording-in-progress-chip'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

type SettledOutcome = Exclude<RecordingOutcome, 'recording'>

const VARIANT: Record<SettledOutcome, 'ok' | 'warn' | 'err'> = {
  complete: 'ok',
  truncated: 'warn',
  failed: 'err',
}

export function OutcomeChip({ recording: r }: { recording: Recording }) {
  if (r.outcome === 'recording') {
    return <RecordingInProgressChip />
  }

  const term = shapeFor(
    RECORDING_OUTCOME_TERMS,
    r.outcome,
    NOT_YET_IN_THIS_BUILD_TERM,
  )

  return (
    <TermTip term={term}>
      <Badge
        variant={shapeFor(VARIANT, r.outcome, 'mute')}
        className="font-bold"
      >
        <ChipDot />
        {term.label}
      </Badge>
    </TermTip>
  )
}
