import {
  STARTUP_SEGMENTS,
  type LiveStartup,
  type LiveStartupSegment,
} from '@/lib/live-wire'

/**
 * What each segment waits for, the way the API measures it. The lock and the
 * transcoder both begin once the tuner is secured and run side by side, so
 * neither is measured from the other; the header waits for both, and the
 * picture for the header.
 */
const WAITS_FOR: Record<LiveStartupSegment, LiveStartupSegment[]> = {
  tunerSecured: [],
  channelLocked: ['tunerSecured'],
  transcoderStarted: ['tunerSecured'],
  initReached: ['channelLocked', 'transcoderStarted'],
  firstPicture: ['initReached'],
}

/**
 * The rows the startup is read in. The wire reports five segments; the screen
 * draws four, the way the design writes them, with the header's arrival folded
 * into the wait for the first picture it announces: that row begins where the
 * header's wait does and ends where the picture arrives.
 */
export const STARTUP_ROWS: {
  segment: LiveStartupSegment
  begins: LiveStartupSegment
  label: string
}[] = [
  { segment: 'tunerSecured', begins: 'tunerSecured', label: 'チューナー確保' },
  { segment: 'channelLocked', begins: 'channelLocked', label: '選局(lock)' },
  {
    segment: 'transcoderStarted',
    begins: 'transcoderStarted',
    label: 'トランスコーダ起動',
  },
  { segment: 'firstPicture', begins: 'initReached', label: '最初の絵' },
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
 * Whether the segment is behind us: reached, or waited for by one that was.
 * The reports come with the pings, and a channel that comes up in four seconds
 * sends none between the handshake and the header, so a segment the wire has
 * not named is read off the ones it has.
 */
function behind(startup: LiveStartup, segment: LiveStartupSegment): boolean {
  return (
    startup[segment] !== undefined ||
    STARTUP_SEGMENTS.some(
      (later) => WAITS_FOR[later].includes(segment) && behind(startup, later),
    )
  )
}

/**
 * When the segment could begin: the latest arrival among what it waited for,
 * read through anything unreported to what was. Nothing reported behind it
 * is the start of the session.
 */
function beganAt(startup: LiveStartup, segment: LiveStartupSegment): number {
  return WAITS_FOR[segment].reduce(
    (latest, waited) =>
      Math.max(latest, startup[waited] ?? beganAt(startup, waited)),
    0,
  )
}

/**
 * Where the channel stands between being chosen and being seen, one row per
 * segment: how long each that is behind took, measured from what it waited
 * for rather than from whichever row is drawn above it, and how long each one
 * underway has been going. Two rows can be underway at once, as the lock and
 * the transcoder are.
 */
export function startupRowsOf(
  startup: LiveStartup,
  elapsedMs: number,
): StartupRow[] {
  return STARTUP_ROWS.map(({ segment, begins, label }) => {
    const at = startup[segment]
    const from = beganAt(startup, begins)

    if (behind(startup, segment)) {
      return {
        segment,
        label,
        state: 'done',
        figure: at === undefined ? '—' : seconds(at - from),
      }
    }

    if (WAITS_FOR[begins].every((waited) => behind(startup, waited))) {
      return {
        segment,
        label,
        state: 'now',
        figure: `経過 ${seconds(Math.max(0, elapsedMs - from))}`,
      }
    }

    return { segment, label, state: 'ahead', figure: '—' }
  })
}
