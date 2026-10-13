import { unstable_rethrow } from 'next/navigation'

import { carinaClient } from '@/repository/client/carina'
import type { Reading } from '@/repository/system'

export interface SegmentSettings {
  learning: boolean
}

export type SegmentSettingsWrite = { state: 'ok' } | { state: 'notSaved' }

const SETTINGS = '/api/segments/settings'

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
