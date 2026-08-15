'use server'

import { revalidatePath } from 'next/cache'

import { setTunerDisabled } from '@/repository/tuners'

export async function toggleTuner(deviceId: string, enabled: boolean) {
  await setTunerDisabled(deviceId, !enabled)

  revalidatePath('/settings/tuners')
}
