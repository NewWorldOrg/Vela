import type { Recording, RecordingDetail } from '@/repository/recordings'

export const RECORDING_STATE_FILTERS = [
  '問題のある録画',
  '尻切れ・失敗',
  '未計測',
] as const

const SCRAMBLED_BEYOND_WATCHING = 0.01

export function isLeftScrambled(recording: Pick<Recording, 'scrambledShare'>) {
  return (recording.scrambledShare ?? 0) >= SCRAMBLED_BEYOND_WATCHING
}

export function playsInBrowser(
  recording: Pick<Recording, 'outcome' | 'fileMissing' | 'scrambledShare'>,
) {
  return (
    recording.outcome !== 'failed' &&
    recording.outcome !== 'recording' &&
    !recording.fileMissing &&
    !isLeftScrambled(recording)
  )
}

export function scrambledPercent(detail: RecordingDetail) {
  return ((detail.scrambledShare ?? 0) * 100).toFixed(1)
}
