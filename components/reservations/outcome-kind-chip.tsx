import type { ComponentProps } from 'react'

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
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { alsoSays, pillWidthFor } from '@/components/recordings/status-cell'
import { TermTip } from '@/components/vela/term-tip'

type BadgeTone = ComponentProps<typeof Badge>['variant']

export const OUTCOME_KIND_PILL_WIDTH = pillWidthFor(
  Object.values(RESERVATION_OUTCOME_KIND_TERMS).map((term) => term.label),
)

const KIND_TONE: Record<ReservationOutcomeKind, BadgeTone> = {
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

const NOT_YET_KNOWN_TONE: BadgeTone = 'mute'

export function OutcomeKindChip({
  outcome,
  width,
}: {
  outcome: ReservationOutcome
  width?: BadgeWidth
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

  return (
    <>
      <TermTip term={term}>
        <Badge variant={tone} width={width} className="font-bold">
          {term.label}
        </Badge>
      </TermTip>
    </>
  )
}
