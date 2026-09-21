import type {
  ReservationOutcome,
  ReservationOutcomeKind,
} from '@/repository/reservation-outcomes'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import {
  NOT_YET_IN_THIS_BUILD_TERM,
  RECORDING_OUTCOME_TERMS,
  RESERVATION_OUTCOME_KIND_TERMS,
} from '@/lib/state-terms'
import { numbered } from '@/repository/scan-failures'
import { Badge } from '@/components/ui/badge'
import {
  StateSay,
  alsoSays,
  stateColumnFor,
  toneOf,
} from '@/components/recordings/status-cell'
import { TermTip } from '@/components/vela/term-tip'

type KindTone = 'err' | 'sky' | 'warn' | 'ok' | 'mute'

export const OUTCOME_KIND_COLUMN = stateColumnFor(
  Object.values(RESERVATION_OUTCOME_KIND_TERMS).map((term) => term.label),
)

const KIND_TONE: Record<ReservationOutcomeKind, KindTone> = {
  competing: 'err',
  missed: 'err',
  tuneFailure: 'err',
  recordingFailure: 'err',
  programmeMoved: 'sky',
  programmeGone: 'warn',
  programmeReturned: 'ok',
  retried: 'sky',
  gaveUpRetrying: 'err',
}

const NOT_YET_KNOWN_TONE: KindTone = 'mute'

export function OutcomeKindChip({
  outcome,
  say = false,
}: {
  outcome: ReservationOutcome
  say?: boolean
}) {
  const tone = shapeFor(KIND_TONE, outcome.kind, NOT_YET_KNOWN_TONE)
  const alsoSaidByTheKind = outcome.recordingResult === 'failed'
  const result =
    outcome.recordingResult && !alsoSaidByTheKind
      ? shapeFor(
          RECORDING_OUTCOME_TERMS,
          outcome.recordingResult,
          NOT_YET_IN_THIS_BUILD_TERM,
        ).label
      : undefined
  const term = alsoSays(
    shapeFor(
      RESERVATION_OUTCOME_KIND_TERMS,
      outcome.kind,
      NOT_YET_IN_THIS_BUILD_TERM,
    ),
    outcome.retry,
    outcome.tuneFailure && numbered(outcome.tuneFailure),
    result,
  )

  if (say) {
    return (
      <TermTip term={term}>
        <StateSay tone={toneOf(tone)} bold>
          {term.label}
        </StateSay>
      </TermTip>
    )
  }

  return (
    <TermTip term={term}>
      <Badge variant={tone} className="font-bold">
        {term.label}
      </Badge>
    </TermTip>
  )
}
