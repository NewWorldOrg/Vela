'use server'

import { revalidatePath } from 'next/cache'

import type { ReservationWrite } from '@/repository/reservations'
import {
  cancelReservation,
  restoreReservation,
  setReservationPriority,
} from '@/repository/reservations'

const RESERVATIONS = '/reservations'

export async function dropReservation(id: string): Promise<ReservationWrite> {
  const result = await cancelReservation(id)

  revalidatePath(RESERVATIONS)

  return result
}

export async function bringBackReservation(
  id: string,
): Promise<ReservationWrite> {
  const result = await restoreReservation(id)

  revalidatePath(RESERVATIONS)

  return result
}

export async function raiseReservationPriority(
  id: string,
  priority: number,
): Promise<ReservationWrite> {
  const result = await setReservationPriority(id, priority)

  revalidatePath(RESERVATIONS)

  return result
}
