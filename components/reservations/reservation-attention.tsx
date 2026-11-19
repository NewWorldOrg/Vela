import type {
  Reservation,
  ReservationStanding,
} from '@/repository/reservations'
import type { StateTerm } from '@/lib/state-terms'
import {
  END_UNDECIDED_TERM,
  RESERVATION_EPG_MISSING_TERM,
  RESERVATION_RECEPTION_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { TermTip } from '@/components/vela/term-tip'
import {
  ReservationStateChip,
  divergedTerm,
} from '@/components/reservations/reservation-state-chip'

const STILL_TO_RECORD: ReservationStanding[] = ['scheduled', 'conflict']

export function ReservationAttention({
  reservation,
  loses,
}: {
  reservation: Reservation
  loses?: string
}) {
  if (!STILL_TO_RECORD.includes(reservation.standing)) {
    return <ReservationStateChip reservation={reservation} />
  }

  const notes: { term: StateTerm; calm?: boolean }[] = [
    ...(reservation.receptionUnavailable
      ? [{ term: RESERVATION_RECEPTION_TERM }]
      : []),
    ...(reservation.epg?.programmeMissing
      ? [{ term: RESERVATION_EPG_MISSING_TERM }]
      : []),
    ...(reservation.epg?.diverged
      ? [{ term: divergedTerm(reservation.epg) }]
      : []),
    ...(reservation.endAtConfirmed
      ? []
      : [{ term: END_UNDECIDED_TERM, calm: true }]),
  ]

  return (
    <>
      {reservation.standing === 'conflict' &&
        (loses ? (
          <TermTip
            term={{
              label: loses,
              explanation: RESERVATION_STANDING_TERMS.conflict.explanation,
            }}
          >
            <Badge variant="warn">{loses}</Badge>
          </TermTip>
        ) : (
          <ReservationStateChip reservation={reservation} />
        ))}
      {notes.map(({ term, calm }) => (
        <TermTip key={term.label} term={term}>
          <Badge variant={calm ? 'mute' : 'warn'}>{term.label}</Badge>
        </TermTip>
      ))}
    </>
  )
}
