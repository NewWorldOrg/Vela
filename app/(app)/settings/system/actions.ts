'use server'

import { revalidatePath } from 'next/cache'

import type { SegmentSettingsWrite } from '@/repository/segments'
import { settleLearning } from '@/repository/segments'

const SYSTEM = '/settings/system'

export async function settleTheLearning(
  learning: boolean,
): Promise<SegmentSettingsWrite> {
  const result = await settleLearning(learning)

  revalidatePath(SYSTEM)

  return result
}
