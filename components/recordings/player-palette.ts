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

/** The pill, held on: the state the caption switch reads in. */
export const PLAYER_BUTTON_ON = PLAYER_ROUND_BUTTON_ON

/**
 * How wide the picture may get, and so how wide the board around it is and
 * everything held to the board's width.
 *
 * The picture takes the column it is given. What stops it is the window's
 * height: a 16:9 picture as wide as the column is 9/16 as tall, and past the
 * height that leaves the top bar and the strip under the picture on screen
 * there is nothing gained by growing. So the width is capped at what that
 * height allows — 210px is the bar, the padding over the picture, and the
 * reading that stands under it — and the shorter of the two bounds wins. On a
 * tall window the column wins and the picture fills it; on a short one the
 * height wins and the picture comes down, keeping its shape.
 *
 * The two numbers this replaces were fixed widths, and both of them made the
 * picture small on a wide desk. The board stopped at 1380px and the picture at
 * 1280px, so a 2560 window that had 2115px of column to give showed the picture
 * at half the width of the screen with the rest of the desk empty. 1280px was
 * read as the width past which a pixel would be invented, but it is only the
 * width of one profile: 1080p60 and 1080p30 are offered beside it, and holding
 * every profile to the smallest one's shape threw away what the larger ones
 * carry. Every service that shows video stretches it — the picture is the point
 * of the screen, and softness at a size worth watching beats sharpness at a
 * size that is not.
 *
 * Full screen is the one place both bounds come off: there the board is the
 * screen.
 *
 * `PLAYER_COLUMN` is the bound on its own, for what stands under the board on a
 * full-width screen: the live screen's reading of what is on now sits below the
 * picture, and left as wide as the window it would run out either side of it.
 */
export const PLAYER_COLUMN =
  'mx-auto w-full max-w-[calc((100dvh_-_210px)*16/9)]'

export const PLAYER_BOARD = cn(
  PLAYER_COLUMN,
  'relative overflow-hidden rounded-xl border border-line-strong bg-(--pl-video) shadow-pop-xl outline-none',
  '[&:fullscreen]:flex [&:fullscreen]:max-w-none [&:fullscreen]:flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:shadow-none',
)

/**
 * The face of the player: the board, at 16:9.
 *
 * The width is already bounded so that this height fits the window, so the face
 * needs no height of its own. It stays black because a picture whose own shape
 * is not 16:9 is fitted inside it rather than distorted, and the difference has
 * to stand on something.
 */
export const PLAYER_FACE = 'aspect-video w-full'

/** The box the picture is given on that face: the whole of it. */
export const PLAYER_PICTURE_BOX = 'size-full'

/** The picture in that box, at its own shape. */
export const PLAYER_PICTURE = cn(PLAYER_PICTURE_BOX, 'object-contain')
