'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { TunerToggleResult, TunerWriteResult } from '@/repository/tuners'
import { saveDetectedTuners, setTunerDisabled } from '@/repository/tuners'

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

export async function saveDetection(
  devices: string[],
): Promise<TunerWriteResult> {
  const result = await saveDetectedTuners(devices)

  revalidatePath('/settings/tuners')

  if (result.state === 'ok') {
    redirect('/settings/tuners')
  }

  return result
}
