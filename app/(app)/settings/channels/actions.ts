'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type {
  CandidateTuning,
  ScanScope,
  StartScanResult,
  WriteResult,
} from '@/repository/services'
import {
  addCandidateChannel,
  applyScan,
  cancelScan,
  deleteCandidateChannel,
  selectCandidateChannel,
  startScan,
} from '@/repository/services'

export async function beginScan(scope: ScanScope): Promise<StartScanResult> {
  const result = await startScan(scope)

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

export async function addCandidate(
  serviceKey: string,
  tuning: CandidateTuning,
): Promise<WriteResult> {
  const result = await addCandidateChannel(serviceKey, tuning)

  revalidatePath('/settings/channels')

  return result
}

export async function removeCandidate(
  serviceKey: string,
  candidateChannelId: string,
): Promise<WriteResult> {
  const result = await deleteCandidateChannel(serviceKey, candidateChannelId)

  revalidatePath('/settings/channels')

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
