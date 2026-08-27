'use server'

import { revalidatePath } from 'next/cache'

import type {
  CollectNowResult,
  CollectScope,
  RebuildResult,
} from '@/repository/collection'
import { collectNow, rebuildEpg } from '@/repository/collection'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import {
  cancelReservation,
  createReservation,
  reviseReservation,
} from '@/repository/reservations'

export async function boostCollection(
  scope: CollectScope,
): Promise<CollectNowResult> {
  const result = await collectNow(scope)

  revalidatePath('/guide')

  return result
}

export async function discardAndRebuildEpg(): Promise<RebuildResult> {
  const result = await rebuildEpg()

  revalidatePath('/guide')

  return result
}

export async function reserveProgramme(
  programmeId: string,
): Promise<ReservationWrite> {
  const result = await createReservation(programmeId)

  if (result.state === 'ok') {
    revalidatePath('/guide')
    revalidatePath('/reservations')
  }

  return result
}

export async function dropProgrammeReservation(
  id: string,
): Promise<ReservationWrite> {
  const result = await cancelReservation(id)

  revalidatePath('/guide')
  revalidatePath('/reservations')

  return result
}

export async function reviseProgrammeReservation(
  id: string,
  revision: ReservationRevision,
): Promise<ReservationWrite> {
  const result = await reviseReservation(id, revision)

  revalidatePath('/guide')
  revalidatePath('/reservations')

  return result
}
