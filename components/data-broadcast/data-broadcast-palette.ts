'use client'

import type { BmlKey } from '@/lib/bml/keys'
import type { BandPlace } from '@/lib/data-broadcast-view'
import { cn } from '@/lib/utils'
import { pressable } from '@/components/vela/tactile'

export const DATA_BROADCAST_NAME = 'データ放送'

export const KEYPAD_NAME = 'データ放送のリモコン'

export const BAND_MOCK_WIDTH = 1174

export const BAND_MAX_SCALE = 1.5

export const BAND_UNDER_THE_BOX = 160

export function columnOverTheRow(row: number): string {
  return `calc((100svh - ${210 + row}px) * 16 / 9)`
}

export function columnOverTheBand(row: number): string {
  const around = 210 + row
  const widest = BAND_MOCK_WIDTH * BAND_MAX_SCALE
  const narrow = `calc((100svh - ${around + BAND_UNDER_THE_BOX}px) * 16 / 9)`
  const wide = `calc((100svh - ${around + BAND_UNDER_THE_BOX * BAND_MAX_SCALE}px) * 16 / 9)`
  const growing = `calc((100svh - ${around}px) / (9 / 16 + ${BAND_UNDER_THE_BOX} / ${BAND_MOCK_WIDTH}))`

  return `min(${narrow}, max(${wide}, clamp(${BAND_MOCK_WIDTH}px, ${growing}, ${widest}px)))`
}

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

export function aiming(pressing: Pressing) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault()
    pressing.onAim()
  }
}

export const HYBRIDCAST_NAME = 'Hybridcast'

export const CLOSE_HYBRIDCAST_NAME = 'Hybridcast を閉じる'

export const SHORT_WINDOW = 900

export const REMOTE_GROUP_GAP = 24

export const REMOTE_GROUP_GAP_SHORT = 16

export const REMOTE_UNDER_THE_DISC = 12

export const REMOTE_UNDER_THE_DISC_SHORT = 8
