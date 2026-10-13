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
    return folded ? 'w-11' : 'w-[calc(344rem/16)]'
  }

  if (motion.phase === 'opening') {
    return 'w-[calc(344rem/16)] transition-[width] duration-300 ease-fold still:transition-none'
  }

  if (motion.staggered) {
    return 'w-11 transition-[width] delay-220 duration-300 ease-fold still:transition-none'
  }

  return 'w-11 transition-[width] duration-300 ease-fold still:transition-none'
}

export function foldBand(motion: FoldMotion | undefined): string {
  if (motion === undefined || motion.phase === 'still') {
    return 'translate-x-0'
  }

  if (motion.phase === 'opening') {
    return 'translate-x-0 starting:translate-x-[min(100%,calc(344rem/16))] transition-[translate] duration-300 ease-fold still:transition-none'
  }

  return 'translate-x-[min(100%,calc(344rem/16))] transition-[translate] duration-300 ease-fold still:transition-none'
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

/** The data broadcast as the column sees it: open, and whether the fold was pressed while it was. */
export interface RemoteInTheColumn {
  open: boolean
  touched: boolean
}

/** Whether the column is drawn folded: as remembered, except while the data broadcast is open and its remote is in the column, which unfolds it, until the fold is pressed meanwhile. */
export function foldShown(
  remembered: boolean,
  remote: RemoteInTheColumn,
): boolean {
  return remote.open && !remote.touched ? false : remembered
}
