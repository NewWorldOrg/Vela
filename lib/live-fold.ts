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
    return folded ? 'w-11' : 'w-[calc(372rem/16)]'
  }

  if (motion.phase === 'opening') {
    return 'w-[calc(372rem/16)] transition-[width] duration-300 ease-fold still:transition-none'
  }

  if (motion.staggered) {
    return 'w-11 transition-[width] delay-220 duration-300 ease-fold still:transition-none'
  }

  return 'w-11 transition-[width] duration-300 ease-fold still:transition-none'
}

/** The gap between the player and a column that stands beside it only while the data broadcast is open. */
const BESIDE_THE_PLAYER = 'ml-8'

/** The column a page without one of its own stands beside the player while the data broadcast is open: the fold's widths after the gap from the player, and on the fold's opening, as the column first stands, its width and the gap growing from nothing together. */
export function foldColumnBeside(
  folded: boolean,
  motion: FoldMotion | undefined,
): string {
  if (motion?.phase === 'opening') {
    return `w-[calc(372rem/16)] ${BESIDE_THE_PLAYER} starting:w-0 starting:ml-0 transition-[width,margin-left] duration-300 ease-fold still:transition-none`
  }

  return `${foldColumn(folded, motion)} ${BESIDE_THE_PLAYER}`
}

/** A band slides out by its own width and the 14px the column's clip keeps for rings and shadows, so no edge of it is left standing at the column's side. */
export function foldBand(motion: FoldMotion | undefined): string {
  if (motion === undefined || motion.phase === 'still') {
    return 'translate-x-0'
  }

  if (motion.phase === 'opening') {
    return 'translate-x-0 starting:translate-x-[calc(min(100%,372rem/16)+14rem/16)] transition-[translate] duration-300 ease-fold still:transition-none'
  }

  return 'translate-x-[calc(min(100%,372rem/16)+14rem/16)] transition-[translate] duration-300 ease-fold still:transition-none'
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
