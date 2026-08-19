'use server'

import { revalidatePath } from 'next/cache'

import type {
  CollectNowResult,
  CollectScope,
  RebuildResult,
} from '@/repository/collection'
import { collectNow, rebuildEpg } from '@/repository/collection'

export async function boostCollection(
  scope: CollectScope,
): Promise<CollectNowResult> {
  const result = await collectNow(scope)

  revalidatePath('/guide')

  return result
}

export async function discardAndRebuildEpg(): Promise<RebuildResult> {
  const result = await rebuildEpg()

  revalidatePath('/guide')

  return result
}
