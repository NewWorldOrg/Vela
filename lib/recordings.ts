import { NOT_YET_IN_THIS_BUILD, shapeFor } from '@/lib/not-yet-in-this-build'
import { QUALITY_LEVEL_LABEL, QUALITY_PILL_LABEL } from '@/lib/quality'
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
  saying?: string
}

export const RECORDING_QUALITY_SHAPES: Record<
  QualityLevel,
  RecordingQualityShape
> = {
  good: { variant: 'ok', label: QUALITY_LEVEL_LABEL.good },
  warning: { variant: 'warn', label: QUALITY_LEVEL_LABEL.warn },
  mayNotBeWatchable: {
    variant: 'err',
    label: QUALITY_PILL_LABEL.bad,
    saying: QUALITY_LEVEL_LABEL.bad,
  },
}

const RECORDING_QUALITY_NOT_YET_KNOWN: RecordingQualityShape = {
  variant: 'mute',
  label: NOT_YET_IN_THIS_BUILD,
}

export function recordingQualityShapeOf(
  level: QualityLevel | undefined,
): RecordingQualityShape {
  return level === undefined
    ? RECORDING_QUALITY_NOT_YET_KNOWN
    : shapeFor(RECORDING_QUALITY_SHAPES, level, RECORDING_QUALITY_NOT_YET_KNOWN)
}

export interface UnfinishedDeletionShape {
  label: string
  detail?: string
}

export function unfinishedDeletionShapeOf(
  recording: Pick<Recording, 'unfinishedDeletion'>,
): UnfinishedDeletionShape | undefined {
  const left = recording.unfinishedDeletion

  if (left === undefined) {
    return undefined
  }

  return {
    label: '削除未完了',
    detail:
      left.filesLeft === undefined
        ? undefined
        : `残り ${left.filesLeft} ファイル`,
  }
}

export function inProgressFirst<T extends Pick<Recording, 'outcome'>>(
  recordings: readonly T[],
): T[] {
  return [
    ...recordings.filter((one) => one.outcome === 'recording'),
    ...recordings.filter((one) => one.outcome !== 'recording'),
  ]
}

export function isLeftScrambled(recording: Pick<Recording, 'leftScrambled'>) {
  return recording.leftScrambled === true
}

export function playsInBrowser(
  recording: Pick<Recording, 'outcome' | 'fileMissing' | 'leftScrambled'>,
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
