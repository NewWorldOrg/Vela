'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import type { ProgramBooking } from '@/repository/programs'
import type { ReservationWrite } from '@/repository/reservations'
import { useToast } from '@/components/vela/toast'
import { pressable } from '@/components/vela/tactile'

export type CircleMark = 'none' | 'booked' | 'recording'

function markOf(booking: ProgramBooking | undefined): CircleMark {
  if (!booking) {
    return 'none'
  }

  return booking.standing === 'recording' ? 'recording' : 'booked'
}

const RING: Record<CircleMark, string> = {
  none: 'bg-black/6 dark:bg-white/10',
  booked: 'bg-black/6 dark:bg-white/10',
  recording: 'bg-black/6 dark:bg-white/10',
}

/** Not yet: a hollow ring. Booked: an amber ring, filled. Recording: a red one. */
const DOT: Record<CircleMark, string> = {
  none: 'border-[1.5px] border-ink-2',
  booked: 'border-[1.5px] border-warn bg-warn bg-clip-content p-[2px]',
  recording: 'border-[1.5px] border-rec bg-rec bg-clip-content p-[2px]',
}

function said(written: ReservationWrite): string {
  return written.state === 'rejected'
    ? written.message
    : 'サインインし直してください'
}

/** One press reserves a programme and one press on a reserved or recording programme takes it back, each with a toast whose press undoes it. The mark answers at once and falls back if the write is turned down. */
export function useOneTapReserve({
  programmeId,
  title,
  booking,
  onReserve,
  onCancel,
  onRestore,
}: {
  programmeId: string
  title: string
  booking?: ProgramBooking
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (id: string) => Promise<ReservationWrite>
  onRestore?: (id: string) => Promise<ReservationWrite>
}): { mark: CircleMark; press: () => void } {
  const say = useToast()
  const [, start] = useTransition()
  const told = markOf(booking)
  const [pressed, setPressed] = useState<{ from: CircleMark; to: CircleMark }>()
  const mark = pressed && pressed.from === told ? pressed.to : told

  const reserve = () => {
    setPressed({ from: told, to: 'booked' })
    start(async () => {
      const written = await onReserve(programmeId)

      if (written.state !== 'ok') {
        setPressed(undefined)
        say({ text: said(written) })

        return
      }

      const made = written.reservationId

      say({
        text: `予約しました　${title}`,
        action: made
          ? { label: '取り消す', onPress: () => void onCancel(made) }
          : undefined,
      })
    })
  }

  const takeBack = (id: string) => {
    setPressed({ from: told, to: 'none' })
    start(async () => {
      const written = await onCancel(id)

      if (written.state !== 'ok') {
        setPressed(undefined)
        say({ text: said(written) })

        return
      }

      say({
        text: `予約を取り消しました　${title}`,
        action: onRestore
          ? { label: '元に戻す', onPress: () => void onRestore(id) }
          : undefined,
      })
    })
  }

  return {
    mark,
    press: () => {
      if (mark === 'none') {
        reserve()
      } else if (booking) {
        takeBack(booking.id)
      }
    },
  }
}

/** The circle at the right of a programme's row, pressed once to reserve or to take the reservation back. */
export function ReserveCircle({
  className,
  ...reserving
}: Parameters<typeof useOneTapReserve>[0] & { className?: string }) {
  const { mark, press } = useOneTapReserve(reserving)

  return (
    <button
      type="button"
      data-slot="reserve-circle"
      data-mark={mark}
      aria-label="録画予約"
      aria-pressed={mark !== 'none'}
      onClick={press}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center self-center rounded-full outline-none focus-visible:shadow-ring',
        pressable,
        className,
      )}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-full',
          RING[mark],
        )}
      >
        <i
          aria-hidden="true"
          className={cn('size-3.5 rounded-full', DOT[mark])}
        />
      </span>
    </button>
  )
}
