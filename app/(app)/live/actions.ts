'use server'

import { revalidatePath } from 'next/cache'

import { takeLiveTicket } from '@/repository/live'
import type { ReservationWrite } from '@/repository/reservations'
import { cancelReservation, createReservation } from '@/repository/reservations'
import type { TicketWrite } from '@/repository/tickets'

export async function takeTicket(
  networkId: number,
  serviceId: number,
): Promise<TicketWrite> {
  return takeLiveTicket(networkId, serviceId)
}

export async function recordTheProgramme(
  programmeId: string,
): Promise<ReservationWrite> {
  const result = await createReservation(programmeId)

  if (result.state === 'ok') {
    revalidatePath('/guide')
    revalidatePath('/reservations')
  }

  return result
}

export async function takeTheRecordingBack(
  reservationId: string,
): Promise<ReservationWrite> {
  const result = await cancelReservation(reservationId)

  revalidatePath('/guide')
  revalidatePath('/reservations')

  return result
}
