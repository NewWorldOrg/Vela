import type { ReservationOutcome } from '@/repository/reservation-outcomes'
import {
  RECORDING_OUTCOME_TERMS,
  RESERVATION_OUTCOME_KIND_TERMS,
} from '@/lib/state-terms'
import { numbered } from '@/repository/scan-failures'
import { Badge } from '@/components/ui/badge'
import { TermTip } from '@/components/vela/term-tip'

export function OutcomeKindChip({ outcome }: { outcome: ReservationOutcome }) {
  const term = RESERVATION_OUTCOME_KIND_TERMS[outcome.kind]
  const alsoSaidByTheKind = outcome.recordingResult === 'failed'
  const result =
    outcome.recordingResult && !alsoSaidByTheKind
      ? RECORDING_OUTCOME_TERMS[outcome.recordingResult]
      : undefined

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <TermTip term={term}>
        <Badge variant="err" className="font-bold">
          {term.label}
        </Badge>
      </TermTip>
      {outcome.tuneFailure && (
        <Badge variant="outline" className="font-code">
          {numbered(outcome.tuneFailure)}
        </Badge>
      )}
      {result && (
        <TermTip term={result}>
          <Badge variant="warn">{result.label}</Badge>
        </TermTip>
      )}
    </span>
  )
}
