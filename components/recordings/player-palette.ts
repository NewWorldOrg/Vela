import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'

export const PLAYER_PALETTE = {
  '--pl-bg': '#151418',
  '--pl-video': '#0F0E12',
  '--pl-ink': '#EFEAF2',
  '--pl-ink-2': '#B3ABBF',
  '--pl-ink-3': '#837C90',
  '--pl-accent': '#96BBB4',
  '--pl-lemon': '#D7AC5E',
  '--pl-coral': '#E08A85',
} as CSSProperties

/**
 * The wash the controls are read against: transparent at the top, dark at the
 * bottom edge, over the picture.
 *
 * Every player anyone has used draws this and none of them draws a plate.
 * Plyr's is `linear-gradient(#0000, #000000bf)` with 35px of padding above the
 * row, so the fade is most of the band's height and the controls sit in the
 * solid part of it; video.js keeps a bar at `rgba(43,51,63,.7)`, which is the
 * older form and still translucent. The reason is the same one in both: the
 * bottom of a picture is where a broadcast puts its own captions and credits,
 * and a band that ends in a hard edge cuts them off, while a wash lets them
 * darken and stay readable.
 *
 * Two stops with an eased middle rather than one straight ramp: a linear fade
 * between two alphas has a visible edge at the top where the slope stops, and
 * the middle stop pulls the ramp below it.
 */
export const PLAYER_SCRIM =
  'linear-gradient(to top, rgba(6,5,9,.92) 0%, rgba(6,5,9,.82) 34%, rgba(6,5,9,.58) 58%, rgba(6,5,9,.24) 80%, rgba(6,5,9,0) 100%)'

/** The same wash at the top edge, for what is written over the picture there. */
export const PLAYER_SCRIM_TOP =
  'linear-gradient(to bottom, rgba(6,5,9,.78) 0%, rgba(6,5,9,.42) 52%, rgba(6,5,9,0) 100%)'

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
 * The icon control on the bar: the glyph itself, with nothing drawn round it.
 *
 * A ring round every control is what no player draws. Plyr's `.plyr__control`
 * is `background:#0000; border:0; padding:7px` round an 18px glyph; YouTube and
 * Netflix draw the glyph alone at about 24px. A circled 16px glyph — which is
 * what this was — reads as a row of buttons laid on the picture rather than as
 * the picture's own controls, and it is the smaller half of the two that the
 * eye has to find.
 *
 * So the glyph is 24px and carries the meaning, and the button is a 40px box
 * round it holding the spacing. The 44px press area is the `tap-target`
 * pseudo-element as everywhere else: the area grows past the box, the drawing
 * does not. Off is said by colour, and hover by colour alone — the 1px lift the
 * rest of the app has would move a glyph against a picture that is not moving.
 */
export const PLAYER_GLYPH_BUTTON = cn(
  'tap-target flex size-10 shrink-0 items-center justify-center rounded-md text-(--pl-ink) transition-[color,opacity] duration-150 ease-out',
  '[&_svg]:size-6 opacity-[.92] hover:opacity-100 hover:text-white',
  'focus-visible:shadow-ring focus-visible:outline-none',
  'disabled:text-(--pl-ink-3) disabled:opacity-60 disabled:hover:text-(--pl-ink-3)',
  pressable,
  still,
)

/**
 * The same control, held on — the state a mute or a caption switch reads in.
 *
 * A held control is said with the accent under the glyph rather than with a
 * filled pill, which is how YouTube marks its caption switch: the glyph keeps
 * its size and place, and only what is under it changes.
 */
export const PLAYER_GLYPH_BUTTON_ON =
  'text-white opacity-100 before:absolute before:bottom-[5px] before:h-[2px] before:w-[18px] before:rounded-full before:bg-(--pl-accent) before:content-[""]'

/** The pill, held on: the state a named switch reads in. */
export const PLAYER_BUTTON_ON =
  'border-[rgba(150,187,180,.55)] bg-[rgba(150,187,180,.22)] text-[#C0D8D3]'

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
