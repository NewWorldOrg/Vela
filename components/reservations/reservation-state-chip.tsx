import type {
  Reservation,
  ReservationStanding,
} from '@/repository/reservations'
import { recordingWasRemoved } from '@/lib/reservations'
import {
  END_UNDECIDED_TERM,
  RESERVATION_RECEPTION_TERM,
  RESERVATION_RECORDING_REMOVED_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

/**
 * The standing is one chip. Whether the end is settled, whether the service can
 * be received, and whether the recording it came to is still kept are none of
 * them states nor each other's alternatives, so they are marks beside it rather
 * than entries in the same list.
 *
 * The last of the three is what a settled reservation with nothing to open says
 * for itself. The recording ledger is what put `完了` there, and the projection
 * stays after the recording row is thrown away on purpose: the recording having
 * run and the file having been removed afterwards are two different facts, and
 * dropping the first with the second would leave the ledger unable to say what
 * became of a reservation. What was missing was not the standing but the
 * screen — a row reading `完了` with no recording beside it and nothing said
 * about it reads as broken, which is the one thing it is not.
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
  const removed = recordingWasRemoved({
    standing: reservation.standing,
    recorded: reservation.recordingId !== undefined,
  })

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
