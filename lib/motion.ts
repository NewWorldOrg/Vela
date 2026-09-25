export const MOTION_COOKIE = 'vela-motion'

export type MotionSetting = 'moves' | 'still'

export const MOTION_LABEL = 'アニメーション'

export const MOTION_HINT =
  '切ると、画面の出入りや一覧の展開などの動きを止めます。'

export function motionOf(said: string | undefined): MotionSetting | undefined {
  return said === 'moves' || said === 'still' ? said : undefined
}

export function movesUnless(said: MotionSetting | undefined): boolean {
  return said !== 'still'
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
