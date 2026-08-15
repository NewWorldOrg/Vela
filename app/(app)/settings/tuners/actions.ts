'use server'

import { revalidatePath } from 'next/cache'

import type { TunerToggleResult } from '@/repository/tuners'
import { setTunerDisabled } from '@/repository/tuners'

export async function toggleTuner(
  deviceId: string,
  enabled: boolean,
): Promise<TunerToggleResult> {
  const result = await setTunerDisabled(deviceId, !enabled)

  if (result.state === 'ok') {
    revalidatePath('/settings/tuners')
  }

  return result
}
