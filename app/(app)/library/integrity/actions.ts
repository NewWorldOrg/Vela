'use server'

import { revalidatePath } from 'next/cache'

import type { SweepWrite } from '@/repository/integrity'
import { runIntegrityCheck } from '@/repository/integrity'

const INTEGRITY = '/library/integrity'

export async function sweepForIntegrity(): Promise<SweepWrite> {
  const result = await runIntegrityCheck()

  if (result.state === 'ok') {
    revalidatePath(INTEGRITY)
  }

  return result
}
