import { unstable_rethrow } from 'next/navigation'

import { carinaClient } from '@/repository/client/carina'

export type SkipThresholdRefusal = 'outOfRange' | 'unauthenticated' | 'notSaved'

export type SkipThresholdWrite =
  { state: 'ok' } | { state: SkipThresholdRefusal }

export type SegmentVersionRefusal =
  'learningOff' | 'unauthenticated' | 'notSaved'

export type SegmentVersionWrite =
  { state: 'ok' } | { state: SegmentVersionRefusal }

const SETTINGS = '/api/segments/settings'

const VERSION = '/api/segments/version'

const THRESHOLD_REFUSALS: Partial<Record<number, SkipThresholdRefusal>> = {
  400: 'outOfRange',
  401: 'unauthenticated',
}

export async function settleSkipThreshold(
  skipThreshold: number,
): Promise<SkipThresholdWrite> {
  try {
    const { response } = await carinaClient().PATCH(SETTINGS, {
      body: { skipThreshold },
    })

    if (response.ok) {
      return { state: 'ok' }
    }

    return { state: THRESHOLD_REFUSALS[response.status] ?? 'notSaved' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'notSaved' }
  }
}

const VERSION_REFUSALS: Partial<Record<number, SegmentVersionRefusal>> = {
  401: 'unauthenticated',
  409: 'learningOff',
}

async function changeVersion(
  body: { number: number } | { byHand: false },
): Promise<SegmentVersionWrite> {
  try {
    const { response } = await carinaClient().PATCH(VERSION, { body })

    if (response.ok) {
      return { state: 'ok' }
    }

    return { state: VERSION_REFUSALS[response.status] ?? 'notSaved' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'notSaved' }
  }
}

export function chooseSegmentVersion(
  number: number,
): Promise<SegmentVersionWrite> {
  return changeVersion({ number })
}

export function leaveSegmentVersionToLearning(): Promise<SegmentVersionWrite> {
  return changeVersion({ byHand: false })
}
