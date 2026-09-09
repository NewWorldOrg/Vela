import type { ReservationOutcome } from '@/repository/reservation-outcomes'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import {
  NOT_YET_IN_THIS_BUILD_TERM,
  RECORDING_OUTCOME_TERMS,
  RESERVATION_OUTCOME_KIND_TERMS,
} from '@/lib/state-terms'
import { numbered } from '@/repository/scan-failures'
import { Badge } from '@/components/ui/badge'
import { TermTip } from '@/components/vela/term-tip'

export function OutcomeKindChip({ outcome }: { outcome: ReservationOutcome }) {
  const term = shapeFor(
    RESERVATION_OUTCOME_KIND_TERMS,
    outcome.kind,
    NOT_YET_IN_THIS_BUILD_TERM,
  )
  const alsoSaidByTheKind = outcome.recordingResult === 'failed'
  const result =
    outcome.recordingResult && !alsoSaidByTheKind
      ? shapeFor(
          RECORDING_OUTCOME_TERMS,
          outcome.recordingResult,
          NOT_YET_IN_THIS_BUILD_TERM,
        )
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
