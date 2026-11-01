export const MOTION_COOKIE = 'vela-motion'

export const MOTION_HEADER = 'x-motion'

export type MotionSetting = 'moves' | 'still'

export const MOTION_LABEL = 'アニメーション'

export function motionOf(
  said: string | null | undefined,
): MotionSetting | undefined {
  return said === 'moves' || said === 'still' ? said : undefined
}

export function movesNow(
  said: string | undefined,
  reducedByTheSystem: boolean,
): boolean {
  if (said === 'still') {
    return false
  }

  if (said === 'moves') {
    return true
  }

  return !reducedByTheSystem
}
