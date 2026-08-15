'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { StartScanResult, WriteResult } from '@/repository/services'
import type { ScanSystem } from '@/repository/scan-systems'
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

export async function stopScan(scanId: string): Promise<WriteResult> {
  const result = await cancelScan(scanId)

  revalidatePath('/settings/channels')

  return result
}

export async function commitScan(scanId: string): Promise<WriteResult> {
  const result = await applyScan(scanId)

  revalidatePath('/settings/channels')

  if (result.state === 'ok') {
    redirect('/settings/channels')
  }

  return result
}

export async function selectChannel(
  serviceKey: string,
  candidateChannelId: string,
): Promise<WriteResult> {
  const result = await selectCandidateChannel(serviceKey, candidateChannelId)

  revalidatePath('/settings/channels')

  return result
}
