'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { ScanSystem, StartScanResult } from '@/repository/services'
import {
  applyScan,
  cancelScan,
  selectCandidateChannel,
  startScan,
} from '@/repository/services'

export async function beginScan(
  systems: ScanSystem[],
): Promise<StartScanResult> {
  const result = await startScan(systems)

  revalidatePath('/settings/channels')

  return result
}

export async function stopScan(scanId: string) {
  await cancelScan(scanId)

  revalidatePath('/settings/channels')
}

export async function commitScan(scanId: string) {
  await applyScan(scanId)

  revalidatePath('/settings/channels')

  redirect('/settings/channels')
}

export async function selectChannel(
  serviceKey: string,
  candidateChannelId: string,
) {
  await selectCandidateChannel(serviceKey, candidateChannelId)

  revalidatePath('/settings/channels')
}
