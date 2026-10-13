import { unstable_rethrow } from 'next/navigation'

import { carinaClient } from '@/repository/client/carina'
import type { Reading } from '@/repository/system'

export interface LearningData {
  recordings: number
  seconds: number
  bytes: number
  waiting: number
}

export interface SegmentStatus {
  learningData: LearningData
}

export async function getSegmentStatus(): Promise<Reading<SegmentStatus>> {
  try {
    const { data, response } = await carinaClient().GET('/api/segments/status')

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const status = data?.data

    if (!status) {
      return { state: 'unavailable' }
    }

    const { learningData } = status

    return {
      state: 'ok',
      value: {
        learningData: {
          recordings: Number(learningData.recordings),
          seconds: Number(learningData.seconds),
          bytes: Number(learningData.bytes),
          waiting: Number(learningData.waiting),
        },
      },
    }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
}
