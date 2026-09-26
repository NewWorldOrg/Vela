import type { CSSProperties } from 'react'

export const ROW_STEP_MS = 40

export const LAST_ROW_HELD_BACK = 6

export const GRID_STEP_MS = 45

export const GRID_CAP_MS = 360

export const RISE_MS = 700

export const LAST_ONE_THAT_MOVES = 12

export const LAST_ROW_THAT_MOVES = 24

export const ARRIVAL_SPAN_MS = RISE_MS + GRID_CAP_MS + 100

export function moves(index: number): boolean {
  return index < LAST_ONE_THAT_MOVES
}

export function arrivesIn(index: number): string {
  return moves(index) ? 'arrives' : ''
}

export function rowArrivesIn(index: number): string {
  return index < LAST_ROW_THAT_MOVES ? 'row-arrives' : ''
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

export function seatIn(
  index: number,
  columns: number,
): { row: number; column: number } {
  const across = Math.max(1, columns)

  return { row: Math.floor(index / across), column: index % across }
}

export function rowDelayMs(index: number): number {
  return Math.min(index, LAST_ROW_HELD_BACK - 1) * ROW_STEP_MS
}

export function gridDelayMs(row: number, column: number): number {
  return Math.min((row + column) * GRID_STEP_MS, GRID_CAP_MS)
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

export const GUIDE_FACES = [
  '400 1em "Broadcast Marks"',
  '400 1em "Zen Kaku Gothic New"',
  '500 1em "Zen Kaku Gothic New"',
  '700 1em "Zen Kaku Gothic New"',
  '500 1em "M PLUS 1 Code"',
] as const

export function glyphsOf(texts: readonly string[]): string {
  return [...new Set(texts.join(''))].join('')
}

export const PANEL_TITLE_FACE = '700 1em "Zen Maru Gothic"'

export function glyphLoadsOf(
  drawn: readonly string[],
  titles: readonly string[],
): Array<readonly [string, string]> {
  const drawnGlyphs = glyphsOf(drawn)
  const titleGlyphs = glyphsOf(titles)

  return [
    ...(drawnGlyphs === ''
      ? []
      : GUIDE_FACES.map((face) => [face, drawnGlyphs] as const)),
    ...(titleGlyphs === '' ? [] : [[PANEL_TITLE_FACE, titleGlyphs] as const]),
  ]
}

export const BURST_SHAPES = [
  'circle',
  'square',
  'triangle',
  'cross',
  'plus',
] as const

export type BurstShape = (typeof BURST_SHAPES)[number]

export type BurstTone = 'spark' | 'surface' | 'ink'

const BURST_TONES: readonly BurstTone[] = [
  'spark',
  'surface',
  'spark',
  'ink',
  'spark',
  'surface',
  'ink',
  'spark',
  'surface',
  'ink',
]

export interface BurstPiece {
  shape: BurstShape
  tone: BurstTone
  angle: number
  far: number
  spin: number
  size: number
  lag: number
  last: boolean
}

export function burstPiecesOf(count: number): BurstPiece[] {
  const pieces = Array.from({ length: count }, (_, i) => ({
    shape: BURST_SHAPES[i % BURST_SHAPES.length],
    tone: BURST_TONES[i % BURST_TONES.length],
    angle: i * (360 / count) + ((i * 37) % 17) - 8,
    far: 18 + ((i * 53) % 30),
    spin: 160 + ((i * 97) % 260),
    size: 18 + ((i * 7) % 19),
    lag: (i * 17) % 80,
  }))
  const latest = Math.max(...pieces.map((piece) => piece.lag))
  const lastAt = pieces.findIndex((piece) => piece.lag === latest)

  return pieces.map((piece, i) => ({ ...piece, last: i === lastAt }))
}
