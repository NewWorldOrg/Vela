import type { LiveStartup, LiveStartupSegment } from '@/lib/live-wire'

/**
 * The rows the startup is read in. The wire reports five segments; the screen
 * draws four, the way the design writes them, with the header's arrival folded
 * into the wait for the first picture it announces.
 */
export const STARTUP_ROWS: { segment: LiveStartupSegment; label: string }[] = [
  { segment: 'tunerSecured', label: 'チューナー確保' },
  { segment: 'channelLocked', label: '選局(lock)' },
  { segment: 'transcoderStarted', label: 'トランスコーダ起動' },
  { segment: 'firstPicture', label: '最初の絵' },
]

export interface StartupRow {
  segment: LiveStartupSegment
  label: string
  state: 'done' | 'now' | 'ahead'
  /** What the row reads on its right: a span, or a dash where none is known. */
  figure: string
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`
}

/**
 * Where the channel stands between being chosen and being seen, one row per
 * segment: how long each that is behind took, and how long the one underway
 * has been going.
 *
 * A segment behind a later one that was reached is reached too, whether or not
 * the wire had said so by then: the reports come with the pings, and a channel
 * that comes up in four seconds sends none between the handshake and the
 * header. Such a row is drawn done without a figure rather than left waiting
 * behind a row that has finished.
 */
export function startupRowsOf(
  startup: LiveStartup,
  elapsedMs: number,
): StartupRow[] {
  const reachedAt = STARTUP_ROWS.map(({ segment }) => startup[segment])
  const furthest = reachedAt.reduce<number>(
    (found, at, index) => (at !== undefined ? index : found),
    -1,
  )
  const knownBefore = (index: number) =>
    reachedAt
      .slice(0, index)
      .reduce<number>((last, at) => (at === undefined ? last : at), 0)

  return STARTUP_ROWS.map(({ segment, label }, index) => {
    const at = reachedAt[index]

    if (index <= furthest) {
      return {
        segment,
        label,
        state: 'done',
        figure: at === undefined ? '—' : seconds(at - knownBefore(index)),
      }
    }

    if (index === furthest + 1) {
      return {
        segment,
        label,
        state: 'now',
        figure: `経過 ${seconds(Math.max(0, elapsedMs - knownBefore(index)))}`,
      }
    }

    return { segment, label, state: 'ahead', figure: '—' }
  })
}
