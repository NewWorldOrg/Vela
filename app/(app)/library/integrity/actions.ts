'use server'

import { revalidatePath } from 'next/cache'

import type { FindingDiscarded, SweepWrite } from '@/repository/integrity'
import {
  discardIntegrityFinding,
  runIntegrityCheck,
} from '@/repository/integrity'

const INTEGRITY = '/library/integrity'

export async function sweepForIntegrity(): Promise<SweepWrite> {
  const result = await runIntegrityCheck()

  if (result.state === 'ok') {
    revalidatePath(INTEGRITY)
  }

  return result
}

export async function throwStrayAway(
  findingId: string,
): Promise<FindingDiscarded> {
  const result = await discardIntegrityFinding(findingId)

  if (result.state === 'ok') {
    revalidatePath(INTEGRITY)
  }

  return result
}
