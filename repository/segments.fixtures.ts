import type { SegmentSettings } from '@/repository/segments'
import type { Reading } from '@/repository/system'

export const LEARNING_OFF: Reading<SegmentSettings> = {
  state: 'ok',
  value: { learning: false },
}

export const LEARNING_ON: Reading<SegmentSettings> = {
  state: 'ok',
  value: { learning: true },
}
