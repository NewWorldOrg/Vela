export type PlayerFit = 'wide' | 'tight' | 'compact'

export const COMPACT_BELOW = 600

export type WideRow = {
  glyphs: number
  time?: boolean
  chapters?: boolean
  latency?: 'plain' | 'catching up'
}

const GLYPH = 44
const SLIDER = 76
const TIME = 124
const CHAPTERS = 146
const LATENCY = { plain: 124, 'catching up': 232 } as const
const EDGES = 64

export function wideRowWidth(row: WideRow): number {
  return (
    EDGES +
    row.glyphs * GLYPH +
    SLIDER +
    (row.time ? TIME : 0) +
    (row.chapters ? CHAPTERS : 0) +
    (row.latency ? LATENCY[row.latency] : 0)
  )
}

export const SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD = 120

export function fitOf(
  width: number,
  needs: number,
  was: PlayerFit = 'wide',
  settle = 0,
): PlayerFit {
  if (width <= 0) {
    return 'wide'
  }

  const compactBelow = COMPACT_BELOW + (was === 'compact' ? settle : 0)

  if (width < compactBelow) {
    return 'compact'
  }

  const wideFrom = needs + (was === 'wide' ? 0 : settle)

  return width < wideFrom ? 'tight' : 'wide'
}
