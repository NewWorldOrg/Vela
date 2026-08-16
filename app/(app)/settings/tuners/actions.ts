'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import type {
  DriverRestartResult,
  TunerToggleResult,
} from '@/repository/tuners'
import {
  RESTART_TICKET_COOKIE,
  restartDriver,
  serializeRestartTicket,
  setTunerDisabled,
} from '@/repository/tuners'

const TUNERS = '/settings/tuners'

const TICKET_EXTRA_SECONDS = 60

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

/**
 * Asks, and on acceptance writes the ticket into a cookie so the window the
 * screen watches survives a reload. The cookie outlives the deadline a little,
 * so a page opened just after the driver returns can still say so.
 */
export async function askDriverToRestart(): Promise<DriverRestartResult> {
  const result = await restartDriver()

  if (result.state === 'accepted') {
    const store = await cookies()

    store.set(
      RESTART_TICKET_COOKIE,
      serializeRestartTicket({
        previousInstanceId: result.instanceId,
        deadline: Date.now() + result.budgetSeconds * 1000,
        budgetSeconds: result.budgetSeconds,
      }),
      { path: TUNERS, maxAge: result.budgetSeconds + TICKET_EXTRA_SECONDS },
    )

    revalidatePath(TUNERS)
  }

  return result
}

/** Closes the window: the ticket is dropped and the screen re-reads. */
export async function dismissRestartWindow(): Promise<void> {
  const store = await cookies()

  store.set(RESTART_TICKET_COOKIE, '', { path: TUNERS, maxAge: 0 })

  revalidatePath(TUNERS)
}
