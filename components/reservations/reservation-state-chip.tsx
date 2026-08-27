import type {
  Reservation,
  ReservationStanding,
} from '@/repository/reservations'
import {
  END_UNDECIDED_TERM,
  RESERVATION_RECEPTION_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

/**
 * The standing is one chip. Whether the end is settled and whether the service
 * can be received are neither states nor each other's alternatives, so they are
 * marks beside it rather than entries in the same list.
 *
 * The words themselves live in `lib/state-terms` beside what they mean, which
 * is what lets the requirements' vocabulary be held to by a test rather than by
 * whoever reads this file next.
 */
const STANDING: Record<
  ReservationStanding,
  {
    variant: 'ok' | 'err' | 'warn' | 'mute' | 'recording'
    dot?: boolean
    bold?: boolean
  }
> = {
  scheduled: { variant: 'ok', dot: true, bold: true },
  conflict: { variant: 'err', dot: true, bold: true },
  recording: { variant: 'recording', dot: true },
  cancelled: { variant: 'mute' },
  missed: { variant: 'err' },
  complete: { variant: 'ok' },
  truncated: { variant: 'warn' },
  failed: { variant: 'err' },
}

export function ReservationStateChip({
  reservation,
}: {
  reservation: Reservation
}) {
  const chip = STANDING[reservation.standing]
  const term = RESERVATION_STANDING_TERMS[reservation.standing]

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <TermTip term={term}>
        <Badge
          variant={chip.variant}
          className={chip.bold ? 'font-bold' : undefined}
        >
          {chip.dot && <ChipDot />}
          {term.label}
        </Badge>
      </TermTip>
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
    </span>
  )
}
