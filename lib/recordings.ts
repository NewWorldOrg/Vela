import type { RecordingDetail } from '@/repository/recordings'

/** Whether the source TS can be played on the fly, encoded or not. */
export function isPlayableSource(detail: RecordingDetail) {
  return (
    !detail.fileMissing &&
    (detail.outcome === 'complete' || detail.outcome === 'truncated')
  )
}
