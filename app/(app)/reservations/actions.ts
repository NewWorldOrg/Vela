'use server'

import { revalidatePath } from 'next/cache'

import type {
  ReservationBatch,
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import {
  cancelReservation,
  cancelReservations,
  discardReservation,
  discardReservations,
  restoreReservation,
  reviseReservation,
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

export async function reviseReservationDetails(
  id: string,
  revision: ReservationRevision,
): Promise<ReservationWrite> {
  const result = await reviseReservation(id, revision)

  revalidatePath(RESERVATIONS)

  return result
}

export async function throwReservationAway(
  id: string,
): Promise<ReservationWrite> {
  const result = await discardReservation(id)

  revalidatePath(RESERVATIONS)

  return result
}

export async function dropReservations(
  ids: string[],
): Promise<ReservationBatch> {
  const result = await cancelReservations(ids)

  revalidatePath(RESERVATIONS)

  return result
}

export async function throwReservationsAway(
  ids: string[],
): Promise<ReservationBatch> {
  const result = await discardReservations(ids)

  revalidatePath(RESERVATIONS)

  return result
}
