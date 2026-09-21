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
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { alsoSays } from '@/components/recordings/status-cell'
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

function StandingChip({
  standing,
  width,
  also,
}: {
  standing: SettledStanding
  width?: BadgeWidth
  also: (string | undefined | false)[]
}) {
  const chip = shapeFor(STANDING, standing, NOT_YET_KNOWN_CHIP)
  const term = alsoSays(
    shapeFor(RESERVATION_STANDING_TERMS, standing, NOT_YET_IN_THIS_BUILD_TERM),
    ...also,
  )

  return (
    <TermTip term={term}>
      <Badge
        variant={chip.variant}
        width={width}
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

export function ReservationStateChip({
  reservation,
  width,
}: {
  reservation: Reservation
  width?: BadgeWidth
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
      <>
        <TermTip term={term}>
          <Badge variant="mute" width={width}>
            {term.label}
          </Badge>
        </TermTip>
      </>
    )
  }

  if (reservation.standing === 'recording') {
    return (
      <>
        <RecordingInProgressChip width={width} also={also} />
      </>
    )
  }

  return (
    <>
      <StandingChip standing={reservation.standing} width={width} also={also} />
    </>
  )
}
