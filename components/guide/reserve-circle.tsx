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
  none: 'border-line-strong bg-surface',
  booked: 'border-mint-line bg-mint-soft',
  recording: 'border-coral-line bg-coral-soft',
}

const DOT: Record<CircleMark, string> = {
  none: 'bg-coral opacity-85',
  booked: 'bg-mint',
  recording:
    'bg-coral shadow-[0_0_0_4px_color-mix(in_oklab,var(--coral)_25%,transparent)]',
}

function said(written: ReservationWrite): string {
  return written.state === 'rejected'
    ? written.message
    : 'サインインし直してください'
}

/** The circle at the right of a programme's row: one press reserves it, and one press on a reserved or recording programme takes the reservation back. Either way a toast offers the press that undoes it. */
export function ReserveCircle({
  programmeId,
  title,
  booking,
  onReserve,
  onCancel,
  onRestore,
  className,
}: {
  programmeId: string
  title: string
  booking?: ProgramBooking
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (id: string) => Promise<ReservationWrite>
  onRestore?: (id: string) => Promise<ReservationWrite>
  className?: string
}) {
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

  return (
    <button
      type="button"
      data-slot="reserve-circle"
      data-mark={mark}
      aria-label="録画予約"
      aria-pressed={mark !== 'none'}
      onClick={() => {
        if (mark === 'none') {
          reserve()
        } else if (booking) {
          takeBack(booking.id)
        }
      }}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center self-center rounded-full outline-none focus-visible:shadow-ring',
        pressable,
        className,
      )}
    >
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-full border-[1.5px]',
          RING[mark],
        )}
      >
        <i
          aria-hidden="true"
          className={cn('size-[calc(11rem/16)] rounded-full', DOT[mark])}
        />
      </span>
    </button>
  )
}
