import type {
  Reservation,
  ReservationStanding,
} from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

/**
 * The standing is one chip. Whether the end is settled and whether the service
 * can be received are neither states nor each other's alternatives, so they are
 * marks beside it rather than entries in the same list.
 */
const STANDING: Record<
  ReservationStanding,
  {
    variant: 'ok' | 'err' | 'warn' | 'mute' | 'recording'
    label: string
    dot?: boolean
    bold?: boolean
  }
> = {
  scheduled: {
    variant: 'ok',
    label: 'チューナー確保済み',
    dot: true,
    bold: true,
  },
  conflict: { variant: 'err', label: '競合', dot: true, bold: true },
  recording: { variant: 'recording', label: '録画中', dot: true },
  cancelled: { variant: 'mute', label: '取消済み' },
  missed: { variant: 'err', label: '撮り逃し' },
  complete: { variant: 'ok', label: '完了' },
  truncated: { variant: 'warn', label: '尻切れ' },
  failed: { variant: 'err', label: '失敗' },
}

export function ReservationStateChip({
  reservation,
}: {
  reservation: Reservation
}) {
  const chip = STANDING[reservation.standing]

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge
        variant={chip.variant}
        className={chip.bold ? 'font-bold' : undefined}
      >
        {chip.dot && <ChipDot />}
        {chip.label}
      </Badge>
      {!reservation.endAtConfirmed && <Badge variant="warn">終了未定</Badge>}
      {reservation.receptionUnavailable && (
        <Badge variant="err">受信不可</Badge>
      )}
    </span>
  )
}
