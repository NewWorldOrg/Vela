import { SEEK_FLASH_LASTS } from '@/lib/player-keys'

export const SECOND_TAP_WITHIN = 300

export const TAPS_RUN_ON_FOR = SEEK_FLASH_LASTS

export type TapSide = 'back' | 'forward'

export type TapZone = TapSide | 'middle'

export interface TapRun {
  side: TapSide
  lastAt: number
  stepping: boolean
}

export type TapAnswer = 'toggle' | 'wait' | TapSide

export function tapZone(x: number, width: number): TapZone {
  if (!(width > 0) || !Number.isFinite(x)) {
    return 'middle'
  }

  if (x < width / 3) {
    return 'back'
  }

  if (x > (width * 2) / 3) {
    return 'forward'
  }

  return 'middle'
}

/** What a tap on the picture does, given the taps that came just before it. */
export function whatTheTapDoes(
  run: TapRun | null,
  zone: TapZone,
  at: number,
): { answer: TapAnswer; run: TapRun | null } {
  if (zone === 'middle') {
    return { answer: 'toggle', run: null }
  }

  if (run?.stepping && at - run.lastAt <= TAPS_RUN_ON_FOR) {
    return { answer: zone, run: { side: zone, lastAt: at, stepping: true } }
  }

  if (
    run &&
    !run.stepping &&
    run.side === zone &&
    at - run.lastAt <= SECOND_TAP_WITHIN
  ) {
    return { answer: zone, run: { side: zone, lastAt: at, stepping: true } }
  }

  return { answer: 'wait', run: { side: zone, lastAt: at, stepping: false } }
}
