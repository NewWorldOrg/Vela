/** How the player lays its controls out at the width it was given: `wide` is the one row of everything, `tight` the one row without the volume slider, the capture and picture in picture, which move into the gear, and `compact` a phone's: the sends in the middle of the picture, the gear's company at the top, the time and the full screen over the seek bar. */
export type PlayerFit = 'wide' | 'tight' | 'compact'

/** Below this board width the player takes a phone's layout. */
export const COMPACT_BELOW = 600

/** What the wide row holds, to know how wide it is drawn. */
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

/** The width the wide row takes on one line: each glyph with its gap, the volume slider, the time, the chapter button and the latency where they are, and the bar's sides with the room between the two groups. A little over what is drawn, so a row that only just fits is not taken for one that does. */
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

/** How much wider than it needs a board has to grow before it leaves a narrower layout, while the board's own width follows the bar's height (the data broadcast's face open, the bar under the picture): the one row is shorter than the folded one, so the board widens as it narrows its layout, and without this would go back and forth. */
export const SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD = 120

/** The layout for a board this wide, whose wide row needs this much: wide when nothing has been laid out yet, so the server draws what a desk draws. A board in a narrower layout stays in it until it is `settle` wider than the edge. */
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
