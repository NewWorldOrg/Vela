import { NOT_YET_IN_THIS_BUILD, shapeFor } from '@/lib/not-yet-in-this-build'
import { QUALITY_LEVEL_LABEL } from '@/lib/quality'
import type {
  QualityLevel,
  Recording,
  RecordingDetail,
} from '@/repository/recordings'

export const RECORDING_STATE_FILTERS = [
  '問題のある録画',
  '尻切れ・失敗',
  '未計測',
] as const

export interface RecordingQualityShape {
  variant: 'ok' | 'warn' | 'err' | 'mute'
  label: string
}

const RECORDING_QUALITY_SHAPES: Record<QualityLevel, RecordingQualityShape> = {
  good: { variant: 'ok', label: QUALITY_LEVEL_LABEL.good },
  warning: { variant: 'warn', label: QUALITY_LEVEL_LABEL.warn },
  mayNotBeWatchable: { variant: 'err', label: QUALITY_LEVEL_LABEL.bad },
}

const RECORDING_QUALITY_NOT_YET_KNOWN: RecordingQualityShape = {
  variant: 'mute',
  label: NOT_YET_IN_THIS_BUILD,
}

const SCRAMBLED_BEYOND_WATCHING = 0.01

export function recordingQualityShapeOf(
  level: QualityLevel | undefined,
): RecordingQualityShape {
  return level === undefined
    ? RECORDING_QUALITY_NOT_YET_KNOWN
    : shapeFor(RECORDING_QUALITY_SHAPES, level, RECORDING_QUALITY_NOT_YET_KNOWN)
}

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

export function minutesMovedLater(
  promisedEnd: string,
  currentEnd: string,
): number | undefined {
  const moved = new Date(currentEnd).getTime() - new Date(promisedEnd).getTime()

  return moved > 0 ? Math.ceil(moved / 60_000) : undefined
}

export function scrambledPercent(detail: RecordingDetail) {
  return ((detail.scrambledShare ?? 0) * 100).toFixed(1)
}
