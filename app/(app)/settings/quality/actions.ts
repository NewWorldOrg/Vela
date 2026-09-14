'use server'

import { revalidatePath } from 'next/cache'

import type { QualityThresholdKey, QualityWrite } from '@/repository/quality'
import { acknowledgeAnomaly, reviseThreshold } from '@/repository/quality'

export async function changeThreshold(
  key: QualityThresholdKey,
  amount: number,
): Promise<QualityWrite> {
  const result = await reviseThreshold(key, amount)

  revalidatePath('/settings/quality')

  return result
}

export async function acknowledge(id: string): Promise<QualityWrite> {
  const result = await acknowledgeAnomaly(id)

  revalidatePath('/settings/quality')

  return result
}
