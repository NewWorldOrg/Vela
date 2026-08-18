import type { Reservation } from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'

export function ReservationStateChip({
  reservation,
}: {
  reservation: Reservation
}) {
  switch (reservation.state) {
    case 'secured':
      return (
        <Badge variant="ok" className="font-bold">
          <ChipDot />
          チューナー確保済み
        </Badge>
      )
    case 'conflict':
      return (
        <Badge variant="err" className="font-bold">
          <ChipDot />
          競合
        </Badge>
      )
    case 'endUndecided':
      return <Badge variant="warn">終了未定</Badge>
    case 'recording':
      return (
        <Badge variant="recording">
          <ChipDot />
          録画中
        </Badge>
      )
  }
}
