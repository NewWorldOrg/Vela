'use server'

import { revalidatePath } from 'next/cache'

import type {
  DriverRestartResult,
  DriverReturnResult,
  TunerToggleResult,
} from '@/repository/tuners'
import {
  restartDriver,
  setTunerDisabled,
  waitForDriverInstance,
} from '@/repository/tuners'

const TUNERS = '/settings/tuners'

export async function toggleTuner(
  deviceId: string,
  enabled: boolean,
): Promise<TunerToggleResult> {
  const result = await setTunerDisabled(deviceId, !enabled)

  if (result.state === 'ok') {
    revalidatePath(TUNERS)
  }

  return result
}

export async function askDriverToRestart(): Promise<DriverRestartResult> {
  return restartDriver()
}

/**
 * Held open until the driver answers as a new instance, so the screen can say
 * it is back instead of leaving the reader to watch for it.
 */
export async function awaitDriverReturn(
  previousInstanceId: string | undefined,
  budgetSeconds: number,
): Promise<DriverReturnResult> {
  const result = await waitForDriverInstance(previousInstanceId, budgetSeconds)

  revalidatePath(TUNERS)

  return result
}
