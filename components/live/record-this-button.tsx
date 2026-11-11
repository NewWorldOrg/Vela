'use client'

import { useTransition } from 'react'

import type { ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/vela/toasts'
import { ReserveRing } from '@/components/live/reserve-ring'

/** Reserves a programme in one press, and puts up a toast whose press takes the reservation back. */
export function useRecordInOnePress(
  onReserve: (programmeId: string) => Promise<ReservationWrite>,
  onCancel: (reservationId: string) => Promise<ReservationWrite>,
): [boolean, (programmeId: string) => void] {
  const say = useToast()
  const [pending, start] = useTransition()

  const record = (programmeId: string) =>
    start(async () => {
      const written = await onReserve(programmeId)

      if (written.state !== 'ok') {
        say({
          text:
            written.state === 'rejected'
              ? written.message
              : 'サインインし直してください',
        })

        return
      }

      const made = written.reservationId

      say({
        text: '録画予約しました',
        action: made
          ? {
              label: '取り消す',
              onPress: () => {
                void onCancel(made)
              },
            }
          : undefined,
      })
    })

  return [pending, record]
}

/** Reserves the programme on now in one press, and puts up a toast whose press takes the reservation back. */
export function RecordThisButton({
  programmeId,
  onReserve,
  onCancel,
  size = 'sm',
}: {
  programmeId: string
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (reservationId: string) => Promise<ReservationWrite>
  /** Under the picture of a phone, or in the column beside the programme on a wide window. */
  size?: 'sm' | 'lg'
}) {
  const [pending, record] = useRecordInOnePress(onReserve, onCancel)

  return (
    <Button
      variant="record"
      size={size}
      disabled={pending}
      onClick={() => record(programmeId)}
      className={size === 'sm' ? 'h-[calc(38rem/16)]' : undefined}
    >
      <ReserveRing className="border-current" />
      この番組を録画
    </Button>
  )
}
