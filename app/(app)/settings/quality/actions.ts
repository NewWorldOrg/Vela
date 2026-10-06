'use server'

import { revalidatePath } from 'next/cache'

import type {
  QualityThresholdSaved,
  QualityThresholdWrite,
} from '@/repository/quality'
import { saveThresholds } from '@/repository/quality'

export async function changeThresholds(
  writes: QualityThresholdWrite[],
): Promise<QualityThresholdSaved[]> {
  const saved = await saveThresholds(writes)

  revalidatePath('/settings/quality')

  return saved
}
