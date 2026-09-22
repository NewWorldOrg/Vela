export const MOTION_COOKIE = 'vela-motion'

export type MotionSetting = 'moves' | 'still'

export const MOTION_LABEL = '画面の動き'

/*
 * Two answers, and no third. Until somebody answers, the machine's own
 * `prefers-reduced-motion` decides; from then on the answer here wins, which
 * is why nothing is asked and nothing is stored while it stands unanswered.
 */
export function motionOf(said: string | undefined): MotionSetting | undefined {
  return said === 'moves' || said === 'still' ? said : undefined
}

export function movesUnless(said: MotionSetting | undefined): boolean {
  return said !== 'still'
}
