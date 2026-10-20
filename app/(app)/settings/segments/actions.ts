'use server'

import { revalidatePath } from 'next/cache'

import type {
  SegmentVersionWrite,
  SkipThresholdWrite,
} from '@/repository/segments'
import {
  chooseSegmentVersion,
  leaveSegmentVersionToLearning,
  settleSkipThreshold,
} from '@/repository/segments'

const SEGMENTS = '/settings/segments'

function revalidatedOnSuccess<T extends { state: string }>(result: T): T {
  if (result.state === 'ok') {
    revalidatePath(SEGMENTS)
  }

  return result
}

export async function chooseTheVersion(
  number: number,
): Promise<SegmentVersionWrite> {
  return revalidatedOnSuccess(await chooseSegmentVersion(number))
}

export async function leaveTheVersionToLearning(): Promise<SegmentVersionWrite> {
  return revalidatedOnSuccess(await leaveSegmentVersionToLearning())
}

export async function settleTheSkipThreshold(
  threshold: number,
): Promise<SkipThresholdWrite> {
  return revalidatedOnSuccess(await settleSkipThreshold(threshold))
}
