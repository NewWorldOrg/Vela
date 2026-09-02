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

/**
 * The share of a recording's packets that may stay scrambled and still leave a
 * picture behind. It is the same share the API's own quality reading calls
 * 視聴不可の恐れ; at and above it the stream is mostly cipher, and no decoder
 * in the browser or outside it builds a frame out of that.
 */
const SCRAMBLED_BEYOND_WATCHING = 0.01

/**
 * Whether the recording was written without ever being descrambled. This is
 * read off the recording itself rather than asked of the API again: the answer
 * is already on the screen beside the picture, and asking for the picture a
 * second time would build another transcoder for a recording that has nothing
 * to decode.
 */
export function isLeftScrambled(detail: RecordingDetail) {
  return (detail.scrambledShare ?? 0) >= SCRAMBLED_BEYOND_WATCHING
}

/** The scrambled share, spelled the way the screen spells a percentage. */
export function scrambledPercent(detail: RecordingDetail) {
  return ((detail.scrambledShare ?? 0) * 100).toFixed(1)
}
