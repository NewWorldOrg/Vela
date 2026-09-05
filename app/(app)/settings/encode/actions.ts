'use server'

import { revalidatePath } from 'next/cache'

import type { EncodeWrite } from '@/repository/encode'
import {
  callOffEncode,
  defineDestination,
  defineProfile,
} from '@/repository/encode'
import type {
  EncodeDestinationDraft,
  EncodeProfileDraft,
} from '@/repository/encode-terms'

const ENCODE = '/settings/encode'

export async function addProfile(
  draft: EncodeProfileDraft,
): Promise<EncodeWrite> {
  const result = await defineProfile(draft)

  revalidatePath(ENCODE)

  return result
}

export async function addDestination(
  draft: EncodeDestinationDraft,
): Promise<EncodeWrite> {
  const result = await defineDestination(draft)

  revalidatePath(ENCODE)

  return result
}

export async function callOffJob(id: string): Promise<EncodeWrite> {
  const result = await callOffEncode(id)

  revalidatePath(ENCODE)

  return result
}
