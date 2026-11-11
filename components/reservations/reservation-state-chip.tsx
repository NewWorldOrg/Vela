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
  RECORDING_IN_PROGRESS_TERM,
  NOT_YET_IN_THIS_BUILD_TERM,
  RESERVATION_EPG_DIVERGED_TERM,
  RESERVATION_EPG_MISSING_TERM,
  RESERVATION_RECEPTION_TERM,
  RESERVATION_RECORDING_REMOVED_TERM,
  RESERVATION_SAME_BROADCAST_TERM,
  RESERVATION_STANDING_TERMS,
} from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import {
  StateSay,
  alsoSays,
  stateColumnFor,
  toneOf,
} from '@/components/recordings/status-cell'
import { RecordingInProgressChip } from '@/components/vela/recording-in-progress-chip'
import { ChipDot } from '@/components/vela/chip-dot'
import { TermTip } from '@/components/vela/term-tip'

type SettledStanding = Exclude<ReservationStanding, 'recording'>

export const RESERVATION_STATE_COLUMN = stateColumnFor([
  ...Object.values(RESERVATION_STANDING_TERMS).map((term) => term.label),
  RESERVATION_RECORDING_REMOVED_TERM.label,
  RESERVATION_SAME_BROADCAST_TERM.label,
])

const STANDING: Record<
  SettledStanding,
  {
    variant: 'ok' | 'err' | 'warn' | 'mute'
    dot?: boolean
    bold?: boolean
  }
> = {
  scheduled: { variant: 'warn', dot: true, bold: true },
  conflict: { variant: 'warn', dot: true, bold: true },
  cancelled: { variant: 'mute' },
  missed: { variant: 'err' },
  complete: { variant: 'ok' },
  truncated: { variant: 'warn' },
  failed: { variant: 'err' },
}

const NOT_YET_KNOWN_CHIP: (typeof STANDING)[SettledStanding] = {
  variant: 'mute',
}

function StandingChip({
  standing,
  sameBroadcast,
  say,
  also,
}: {
  standing: SettledStanding
  sameBroadcast: boolean
  say: boolean
  also: (string | undefined | false)[]
}) {
  const chip = shapeFor(STANDING, standing, NOT_YET_KNOWN_CHIP)
  const term = alsoSays(
    sameBroadcast
      ? RESERVATION_SAME_BROADCAST_TERM
      : shapeFor(
          RESERVATION_STANDING_TERMS,
          standing,
          NOT_YET_IN_THIS_BUILD_TERM,
        ),
    ...also,
  )

  if (say) {
    return (
      <TermTip term={term}>
        <StateSay tone={toneOf(chip.variant)} bold={chip.bold}>
          {term.label}
        </StateSay>
      </TermTip>
    )
  }

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

function saidBy(term: StateTerm): string {
  return `${term.label}: ${term.explanation}`
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

export function reservationStateLabelOf(reservation: Reservation): string {
  const removed = recordingWasRemoved({
    standing: reservation.standing,
    recorded: reservation.recordingId !== undefined,
  })

  if (reservation.standing === 'recording') {
    return RECORDING_IN_PROGRESS_TERM.label
  }

  if (removed) {
    return RESERVATION_RECORDING_REMOVED_TERM.label
  }

  if (sameBroadcastCancelled(reservation)) {
    return RESERVATION_SAME_BROADCAST_TERM.label
  }

  return shapeFor(
    RESERVATION_STANDING_TERMS,
    reservation.standing,
    NOT_YET_IN_THIS_BUILD_TERM,
  ).label
}

function sameBroadcastCancelled(reservation: Reservation): boolean {
  return (
    reservation.standing === 'cancelled' && reservation.sameBroadcast === true
  )
}

export function ReservationStateChip({
  reservation,
  say = false,
  more = [],
}: {
  reservation: Reservation
  say?: boolean
  more?: string[]
}) {
  const removed = recordingWasRemoved({
    standing: reservation.standing,
    recorded: reservation.recordingId !== undefined,
  })
  const also = [
    !reservation.endAtConfirmed && saidBy(END_UNDECIDED_TERM),
    reservation.receptionUnavailable && saidBy(RESERVATION_RECEPTION_TERM),
    reservation.epg?.programmeMissing && saidBy(RESERVATION_EPG_MISSING_TERM),
    reservation.epg?.diverged && saidBy(divergedTerm(reservation.epg)),
    ...more,
  ]

  if (removed && reservation.standing !== 'recording') {
    const standing = shapeFor(
      RESERVATION_STANDING_TERMS,
      reservation.standing,
      NOT_YET_IN_THIS_BUILD_TERM,
    )
    const term = alsoSays(
      RESERVATION_RECORDING_REMOVED_TERM,
      saidBy(standing),
      ...also,
    )

    return (
      <TermTip term={term}>
        {say ? (
          <StateSay tone="mute">{term.label}</StateSay>
        ) : (
          <Badge variant="mute">{term.label}</Badge>
        )}
      </TermTip>
    )
  }

  if (reservation.standing === 'recording') {
    return <RecordingInProgressChip also={also} />
  }

  return (
    <StandingChip
      standing={reservation.standing}
      sameBroadcast={sameBroadcastCancelled(reservation)}
      say={say}
      also={also}
    />
  )
}

const STILL_TO_RECORD: ReservationStanding[] = ['scheduled', 'conflict']

/**
 * The chips a reservation's row carries, only for what needs a look: recording now, what a conflict costs it (or that it
 * is in one), an end not yet fixed, a channel it cannot tune, a programme the guide moved or lost, and how a finished
 * reservation ended. A reservation that simply holds its tuner carries none.
 */
export function ReservationAttention({
  reservation,
  loses,
}: {
  reservation: Reservation
  /** What the reservation goes without in its conflict, when the overlap can be read: 頭 30 分が欠ける. */
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
