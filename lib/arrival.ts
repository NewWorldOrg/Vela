import type { CSSProperties } from 'react'

export const ROW_STEP_MS = 40

export const LAST_ROW_HELD_BACK = 6

export const COLUMN_STEP_MS = 40

export const LAST_COLUMN_HELD_BACK = 8

export const GRID_STEP_MS = 30

export const GRID_CAP_MS = 240

export const RISE_MS = 700

export const LAST_ONE_THAT_MOVES = 12

export const ARRIVAL_SPAN_MS = RISE_MS + GRID_CAP_MS + 100

export function moves(index: number): boolean {
  return index < LAST_ONE_THAT_MOVES
}

export function arrivesIn(index: number): string {
  return moves(index) ? 'arrives' : ''
}

export function risesIn(index: number): string {
  return moves(index) ? 'rises' : ''
}

export function joinsIn(index: number): string {
  return moves(index) ? 'joins' : ''
}

export function delayOf(ms: number): CSSProperties {
  return { '--delay': `${ms}ms` } as CSSProperties
}

export function groupDelayOf(ms: number): CSSProperties {
  return { '--d': `${ms}ms` } as CSSProperties
}

export function rowDelayMs(index: number): number {
  return Math.min(index, LAST_ROW_HELD_BACK - 1) * ROW_STEP_MS
}

export function columnDelayMs(index: number): number {
  return Math.min(index, LAST_COLUMN_HELD_BACK - 1) * COLUMN_STEP_MS
}

export function seatIn(
  index: number,
  columns: number,
): { row: number; column: number } {
  const across = Math.max(1, columns)

  return { row: Math.floor(index / across), column: index % across }
}

export function gridDelayMs(row: number, column: number): number {
  return Math.min((row + column) * GRID_STEP_MS, GRID_CAP_MS)
}

export function nowLineDelayMs(): number {
  return columnDelayMs(LAST_COLUMN_HELD_BACK - 1) + RISE_MS
}

export function columnsAcross(node: Element | null): number {
  if (node === null) {
    return 1
  }

  const tracks = getComputedStyle(node)
    .gridTemplateColumns.split(' ')
    .filter((one) => one.length > 0).length

  return Math.max(1, tracks)
}

export function newcomersOf(
  before: readonly string[],
  now: readonly string[],
): Set<string> {
  const were = new Set(before)

  return new Set(now.filter((id) => !were.has(id)))
}
