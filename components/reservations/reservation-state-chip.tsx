import type {
  EpgDrift,
  Reservation,
  ReservationStanding,
} from '@/repository/reservations'
import { recordingWasRemoved } from '@/lib/reservations'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import type { StateTerm } from '@/lib/state-terms'
import {
  END_UNDECIDED_TERM,
  NOT_YET_IN_THIS_BUILD_TERM,
  RESERVATION_EPG_DIVERGED_TERM,
  RESERVATION_EPG_MISSING_TERM,
  RESERVATION_RECEPTION_TERM,
  RESERVATION_RECORDING_REMOVED_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { RecordingInProgressChip } from '@/components/vela/recording-in-progress-chip'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

type SettledStanding = Exclude<ReservationStanding, 'recording'>

const STANDING: Record<
  SettledStanding,
  {
    variant: 'ok' | 'err' | 'warn' | 'mute'
    dot?: boolean
    bold?: boolean
  }
> = {
  scheduled: { variant: 'ok', dot: true, bold: true },
  conflict: { variant: 'err', dot: true, bold: true },
  cancelled: { variant: 'mute' },
  missed: { variant: 'err' },
  complete: { variant: 'ok' },
  truncated: { variant: 'warn' },
  failed: { variant: 'err' },
}

const NOT_YET_KNOWN_CHIP: (typeof STANDING)[SettledStanding] = {
  variant: 'mute',
}

function StandingChip({ standing }: { standing: SettledStanding }) {
  const chip = shapeFor(STANDING, standing, NOT_YET_KNOWN_CHIP)
  const term = shapeFor(
    RESERVATION_STANDING_TERMS,
    standing,
    NOT_YET_IN_THIS_BUILD_TERM,
  )

  return (
    <TermTip term={term}>
      <Badge
        variant={chip.variant}
        className={chip.bold ? 'font-bold' : undefined}
      >
        {chip.dot && <ChipDot />}
        {term.label}
      </Badge>
    </TermTip>
  )
}

function divergedTerm(drift: EpgDrift): StateTerm {
  const moved = drift.changes.map(
    (one) => `${one.field} ${one.before} → ${one.after}`,
  )
  const noticed = drift.noticedAt ? `${drift.noticedAt} に検出。` : undefined

  return {
    label: RESERVATION_EPG_DIVERGED_TERM.label,
    explanation: [
      RESERVATION_EPG_DIVERGED_TERM.explanation,
      moved.length > 0 ? `${moved.join('、')}。` : undefined,
      noticed,
    ]
      .filter((one) => one !== undefined)
      .join(''),
  }
}

export function ReservationStateChip({
  reservation,
}: {
  reservation: Reservation
}) {
  const removed = recordingWasRemoved({
    standing: reservation.standing,
    recorded: reservation.recordingId !== undefined,
  })

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {reservation.standing === 'recording' ? (
        <RecordingInProgressChip />
      ) : (
        <StandingChip standing={reservation.standing} />
      )}
      {!reservation.endAtConfirmed && (
        <TermTip term={END_UNDECIDED_TERM}>
          <Badge variant="warn">{END_UNDECIDED_TERM.label}</Badge>
        </TermTip>
      )}
      {reservation.receptionUnavailable && (
        <TermTip term={RESERVATION_RECEPTION_TERM}>
          <Badge variant="err">{RESERVATION_RECEPTION_TERM.label}</Badge>
        </TermTip>
      )}
      {reservation.epg?.programmeMissing && (
        <TermTip term={RESERVATION_EPG_MISSING_TERM}>
          <Badge variant="err">{RESERVATION_EPG_MISSING_TERM.label}</Badge>
        </TermTip>
      )}
      {reservation.epg?.diverged && (
        <TermTip term={divergedTerm(reservation.epg)}>
          <Badge variant="warn">{RESERVATION_EPG_DIVERGED_TERM.label}</Badge>
        </TermTip>
      )}
      {removed && (
        <TermTip term={RESERVATION_RECORDING_REMOVED_TERM}>
          <Badge variant="mute">
            {RESERVATION_RECORDING_REMOVED_TERM.label}
          </Badge>
        </TermTip>
      )}
    </span>
  )
}
