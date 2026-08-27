import type { RecordingDetail } from '@/repository/recordings'

/**
 * The states the library offers to narrow by. A screen picks one of these, so
 * the list lives where a Client Component may read it — a module under
 * `repository/` that reaches the API cannot be read from the browser side.
 */
export const RECORDING_STATE_FILTERS = [
  '問題のある録画',
  '尻切れ・失敗',
  '未計測',
] as const

/** Whether the source TS can be played on the fly, encoded or not. */
export function isPlayableSource(detail: RecordingDetail) {
  return (
    !detail.fileMissing &&
    (detail.outcome === 'complete' || detail.outcome === 'truncated')
  )
}
