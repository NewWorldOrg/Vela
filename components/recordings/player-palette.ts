import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'

export const PLAYER_PALETTE = {
  '--pl-bg': '#151418',
  '--pl-video': '#0F0E12',
  /*
   * The plate the controls sit on, laid over the picture. Flat and not a
   * gradient: SPEC allows no gradient anywhere, and a bar that fades out at
   * its top edge is one.
   */
  '--pl-chrome': 'rgba(17,16,20,.94)',
  '--pl-ink': '#EFEAF2',
  '--pl-ink-2': '#B3ABBF',
  '--pl-ink-3': '#837C90',
  '--pl-accent': '#96BBB4',
  '--pl-lemon': '#D7AC5E',
  '--pl-coral': '#E08A85',
} as CSSProperties

/**
 * Switched off is said in colour, never in `opacity`.
 *
 * A translucent element opens a stacking context of its own, and the 44px
 * press area `tap-target` lays down is a `::after` inside it — demoted with
 * it, and then covered by any area beside it that is still in the page's own
 * layer. The probe caught three controls that way: they had the area, and a
 * neighbour's was drawn over it.
 */
const PLAYER_BUTTON_OFF =
  'disabled:border-white/12 disabled:bg-white/3 disabled:text-(--pl-ink-3) disabled:hover:border-white/12 disabled:hover:bg-white/3 disabled:hover:text-(--pl-ink-3)'

export const PLAYER_BUTTON = cn(
  'tap-target rounded-full border border-white/25 bg-white/5 px-[13px] py-[5px] text-[11.5px] font-bold whitespace-nowrap text-(--pl-ink-2) transition-[translate,background-color,color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px focus-visible:shadow-ring focus-visible:outline-none',
  PLAYER_BUTTON_OFF,
  pressable,
  still,
)

/**
 * The round icon button on the bar. The area is 44px and the drawn button is
 * 32px, which is what SPEC's 触れる大きさ asks for: the area grows, the
 * drawing does not.
 */
export const PLAYER_ROUND_BUTTON = cn(
  'tap-target flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/5 text-(--pl-ink-2) transition-[translate,background-color,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:bg-white/15 hover:text-(--pl-ink) active:translate-x-px active:translate-y-px focus-visible:shadow-ring focus-visible:outline-none',
  '[&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:scale-110 hover:[&_svg]:-rotate-6',
  PLAYER_BUTTON_OFF,
  pressable,
  still,
)

/** The same button, held on: the state a mute or a fullscreen reads in. */
export const PLAYER_ROUND_BUTTON_ON =
  'border-[rgba(150,187,180,.55)] bg-[rgba(150,187,180,.22)] text-[#C0D8D3]'

/**
 * How wide the player stands, and where the picture stops growing.
 *
 * The pane used to take the whole content column while the picture inside it
 * stayed at 757px, so on a wide window a small picture floated in a field of
 * black. The picture takes the pane now, and the pane is what is bounded.
 *
 * 1280px is the width of the picture the API encodes when no profile is asked
 * for (`720p30` is 1280x720), so at the cap the default picture is drawn at
 * one pixel per pixel and nothing above it is invented. The second bound is
 * the window's own height: a 16:9 picture as wide as the pane is 9/16 as tall,
 * and past about three fifths of the window there is no room left under it for
 * the reading of how the recording ended, or the record below.
 */
export const PLAYER_PANE = 'mx-auto w-full max-w-[1280px]'

export const PLAYER_PICTURE_PANE =
  'mx-auto w-full max-w-[min(1280px,calc(62vh*16/9))]'
