'use client'

import type { BmlKey } from '@/lib/bml/keys'
import type { BandPlace } from '@/lib/data-broadcast-view'
import { cn } from '@/lib/utils'
import { pressable } from '@/components/vela/tactile'

export const DATA_BROADCAST_NAME = 'データ放送'

export const KEYPAD_NAME = 'データ放送のリモコン'

/** The width of the mock's player. The band is drawn at the mock's measures there and grows with the player, up to one and a half times the mock. */
export const BAND_MOCK_WIDTH = 1174

export const BAND_MAX_SCALE = 1.5

/** The band under the box, in a window: the keys' row with 12px above and below, at the mock's measures. */
export const BAND_UNDER_THE_BOX = 160

/** The widest the player's column may be while its control row, `row` pixels high as laid out, is under its box and the remote is in the page's column: the window holds the picture, the 210px around it and the row. */
export function columnOverTheRow(row: number): string {
  return `calc((100svh - ${210 + row}px) * 16 / 9)`
}

/** The widest the player's column may be while its control row, `row` pixels high as laid out, and the band are under its box: the window holds the picture, the 210px around it, the row and the band. The band is 160px up to the mock's width, grows with the column up to one and a half times the mock, and stays there; each stretch gives its own bound and the column takes the one its width falls in. */
export function columnOverTheBand(row: number): string {
  const around = 210 + row
  const widest = BAND_MOCK_WIDTH * BAND_MAX_SCALE
  const narrow = `calc((100svh - ${around + BAND_UNDER_THE_BOX}px) * 16 / 9)`
  const wide = `calc((100svh - ${around + BAND_UNDER_THE_BOX * BAND_MAX_SCALE}px) * 16 / 9)`
  const growing = `calc((100svh - ${around}px) / (9 / 16 + ${BAND_UNDER_THE_BOX} / ${BAND_MOCK_WIDTH}))`

  return `min(${narrow}, max(${wide}, clamp(${BAND_MOCK_WIDTH}px, ${growing}, ${widest}px)))`
}

/** The widest the player's column may be: unbounded but by the page while the control row is over the picture; with the control row under the box, the window holds the picture, the row and, where the remote is a band under it, the band,. */
export function widestColumn(
  place: BandPlace,
  underTheBox: boolean,
  row: number,
): string | undefined {
  if (!underTheBox) {
    return undefined
  }

  return place === 'column' ? columnOverTheRow(row) : columnOverTheBand(row)
}

const SINKS =
  'transition-[translate,background-color,border-color,color] duration-150 ease-toy'

export const KEY_LOOK = cn(
  'relative flex shrink-0 items-center justify-center rounded-full border border-transparent bg-white/12 font-semibold text-(--pl-ink) select-none hover:bg-white/20 focus-visible:shadow-ring focus-visible:outline-none active:bg-white/25',
  SINKS,
  pressable,
)

export const PILL = cn(
  KEY_LOOK,
  'h-(--pill-h) w-(--pill-w) text-[length:var(--pill-font)] leading-none after:absolute after:-inset-x-[2px] after:-inset-y-[4px] after:content-[""]',
)

export interface Pressing {
  onKey: (key: BmlKey) => void
  onAim: () => void
}

/** A key pressed by the pointer keeps the focus on the player, so the keyboard goes on working after it. */
export function aiming(pressing: Pressing) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault()
    pressing.onAim()
  }
}

export const HYBRIDCAST_NAME = 'Hybridcast'

export const CLOSE_HYBRIDCAST_NAME = 'Hybridcast を閉じる'

/** The window height below which the remote steps down to its short measures, so the whole of it fits the column down to a window 760px tall. The classes below spell it out, as a class cannot be built from a value. */
export const SHORT_WINDOW = 900

/** The gap between the remote's groups in the column, as the mock spaces them: the station's line, the cross with its row of `戻る` and `d`, the colours and the digits; and the closer gap in a short window. */
export const REMOTE_GROUP_GAP = 24

export const REMOTE_GROUP_GAP_SHORT = 16

/** The gap between the disc and the row of `戻る` and `d` under it, and in a short window. */
export const REMOTE_UNDER_THE_DISC = 12

export const REMOTE_UNDER_THE_DISC_SHORT = 8
