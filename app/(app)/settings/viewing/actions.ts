'use server'

import { revalidatePath } from 'next/cache'

import type { Residence } from '@/lib/bml/receiver-info'
import type { ResidenceWrite } from '@/repository/data-broadcast-settings'
import { settleResidence } from '@/repository/data-broadcast-settings'

const VIEWING = '/settings/viewing'

export async function settleTheResidence(
  residence: Residence,
): Promise<ResidenceWrite> {
  const result = await settleResidence(residence)

  if (result.state === 'ok') {
    revalidatePath(VIEWING)
  }

  return result
}
