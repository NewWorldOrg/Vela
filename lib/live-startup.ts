import {
  STARTUP_SEGMENTS,
  type LiveStartup,
  type LiveStartupSegment,
} from '@/lib/live-wire'

const WAITS_FOR: Record<LiveStartupSegment, LiveStartupSegment[]> = {
  tunerSecured: [],
  channelLocked: ['tunerSecured'],
  transcoderStarted: ['tunerSecured'],
  initReached: ['channelLocked', 'transcoderStarted'],
  firstPicture: ['initReached'],
}

export const STARTUP_ROWS: {
  segment: LiveStartupSegment
  begins: LiveStartupSegment
  label: string
}[] = [
  { segment: 'tunerSecured', begins: 'tunerSecured', label: 'チューナー確保' },
  { segment: 'channelLocked', begins: 'channelLocked', label: '選局' },
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
  figure: string
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`
}

function behind(startup: LiveStartup, segment: LiveStartupSegment): boolean {
  return (
    startup[segment] !== undefined ||
    STARTUP_SEGMENTS.some(
      (later) => WAITS_FOR[later].includes(segment) && behind(startup, later),
    )
  )
}

function beganAt(startup: LiveStartup, segment: LiveStartupSegment): number {
  return WAITS_FOR[segment].reduce(
    (latest, waited) =>
      Math.max(latest, startup[waited] ?? beganAt(startup, waited)),
    0,
  )
}

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
