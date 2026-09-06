export type FoldPhase = 'still' | 'opening' | 'closing'

export interface FoldMotion {
  shown: boolean
  phase: FoldPhase
  staggered: boolean
  onSettle: () => void
}

export const FOLD_STEP_MS = 22

export const FOLD_LAST_STEP = 10

export function foldColumn(
  folded: boolean,
  motion: FoldMotion | undefined,
): string {
  if (motion === undefined || motion.phase === 'still') {
    return folded ? 'w-11' : 'w-[344px]'
  }

  if (motion.phase === 'opening') {
    return 'w-[344px] transition-[width] duration-300 ease-fold motion-reduce:transition-none'
  }

  if (motion.staggered) {
    return 'w-11 transition-[width] delay-220 duration-300 ease-fold motion-reduce:transition-none'
  }

  return 'w-11 transition-[width] duration-300 ease-fold motion-reduce:transition-none'
}

export function foldBand(motion: FoldMotion | undefined): string {
  if (motion === undefined || motion.phase === 'still') {
    return 'translate-x-0'
  }

  if (motion.phase === 'opening') {
    return 'translate-x-0 starting:translate-x-[min(100%,344px)] transition-[translate] duration-300 ease-fold motion-reduce:transition-none'
  }

  return 'translate-x-[min(100%,344px)] transition-[translate] duration-300 ease-fold motion-reduce:transition-none'
}

export function foldBandDelay(
  index: number,
  motion: FoldMotion | undefined,
): string | undefined {
  if (motion === undefined || motion.phase === 'still' || !motion.staggered) {
    return undefined
  }

  const step = Math.min(index, FOLD_LAST_STEP)

  return `${(motion.phase === 'closing' ? FOLD_LAST_STEP - step : step) * FOLD_STEP_MS}ms`
}
