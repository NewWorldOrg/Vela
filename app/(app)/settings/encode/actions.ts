'use server'

import { revalidatePath } from 'next/cache'

import type { EncodeRemoval, EncodeWrite } from '@/repository/encode'
import {
  callOffEncode,
  defineDestination,
  defineProfile,
  removeDestination,
  removeProfile,
  reviseDestination,
  reviseProfile,
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

export async function changeProfile(
  id: string,
  draft: EncodeProfileDraft,
): Promise<EncodeWrite> {
  const result = await reviseProfile(id, draft)

  revalidatePath(ENCODE)

  return result
}

export async function dropProfile(id: string): Promise<EncodeRemoval> {
  const result = await removeProfile(id)

  revalidatePath(ENCODE)

  return result
}

export async function changeDestination(
  id: string,
  draft: EncodeDestinationDraft,
): Promise<EncodeWrite> {
  const result = await reviseDestination(id, draft)

  revalidatePath(ENCODE)

  return result
}

export async function dropDestination(id: string): Promise<EncodeRemoval> {
  const result = await removeDestination(id)

  revalidatePath(ENCODE)

  return result
}

export async function callOffJob(id: string): Promise<EncodeWrite> {
  const result = await callOffEncode(id)

  revalidatePath(ENCODE)

  return result
}
