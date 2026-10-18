import { unstable_rethrow } from 'next/navigation'

import { carinaClient } from '@/repository/client/carina'
import type { Reading } from '@/repository/system'

export interface SegmentSettings {
  learning: boolean
}

export type SegmentSettingsWrite = { state: 'ok' } | { state: 'notSaved' }

export type SkipThresholdRefusal = 'outOfRange' | 'unauthenticated' | 'notSaved'

export type SkipThresholdWrite =
  { state: 'ok' } | { state: SkipThresholdRefusal }

export type SegmentVersionRefusal =
  'learningOff' | 'unauthenticated' | 'notSaved'

export type SegmentVersionWrite =
  { state: 'ok' } | { state: SegmentVersionRefusal }

const SETTINGS = '/api/segments/settings'

const VERSION = '/api/segments/version'

export async function getSegmentSettings(): Promise<Reading<SegmentSettings>> {
  try {
    const { data, response } = await carinaClient().GET(SETTINGS)

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const settings = data?.data

    if (!settings) {
      return { state: 'unavailable' }
    }

    return { state: 'ok', value: { learning: settings.learning } }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
}

export async function settleLearning(
  learning: boolean,
): Promise<SegmentSettingsWrite> {
  try {
    const { response } = await carinaClient().PATCH(SETTINGS, {
      body: { learning },
    })

    return response.ok ? { state: 'ok' } : { state: 'notSaved' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'notSaved' }
  }
}

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
