import type { LearningData, SegmentStatus } from '@/repository/segment-status'
import type { Reading } from '@/repository/system'

function learningData(data: LearningData): Reading<SegmentStatus> {
  return { state: 'ok', value: { learningData: data } }
}

export const NO_LEARNING_DATA = learningData({
  recordings: 0,
  seconds: 0,
  bytes: 0,
  waiting: 0,
})

export const LEARNING_DATA = learningData({
  recordings: 312,
  seconds: 674_100,
  bytes: 4_617_089_843,
  waiting: 0,
})

export const LEARNING_DATA_WAITING = learningData({
  recordings: 312,
  seconds: 674_100,
  bytes: 4_617_089_843,
  waiting: 12,
})

export const SEGMENT_STATUS_UNREAD: Reading<SegmentStatus> = {
  state: 'unavailable',
}
