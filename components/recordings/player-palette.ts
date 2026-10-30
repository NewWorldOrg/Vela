import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'

export const PLAYER_SCRIM = 'var(--pl-scrim)'

export const PLAYER_CHROME_FADE =
  'transition-[opacity,translate] duration-100 ease-[cubic-bezier(.4,0,1,1)] data-[up]:duration-[250ms] data-[up]:ease-[cubic-bezier(0,0,.2,1)]'

/** The control row over the picture: on the board's bottom, which is the picture's, above the safe area when the page fills the screen, and fading out when the pointer rests. */
export const PLAYER_CHROME_OVER = cn(
  'absolute inset-x-0 bottom-0 z-10',
  '[[data-fill]_&]:right-[env(safe-area-inset-right)] [[data-fill]_&]:bottom-[env(safe-area-inset-bottom)] [[data-fill]_&]:left-[env(safe-area-inset-left)]',
  'pointer-events-none translate-y-2 opacity-0',
  PLAYER_CHROME_FADE,
  'data-[up]:pointer-events-auto data-[up]:translate-y-0 data-[up]:opacity-100',
  'has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:translate-y-0 has-[:focus-visible]:opacity-100',
)

/** The control row under the picture, while the data broadcast's face is open in a window: in the board's flow on the box's own ground, and always there, so nothing lies over the face. */
export const PLAYER_CHROME_UNDER = 'relative z-10 bg-(--pl-bg)'

export const PLAYER_BREAK_BAND = 'var(--pl-break-band)'

export const PLAYER_THEME_BAND = 'var(--pl-theme-band)'

export const PLAYER_SCRIM_TOP = 'var(--pl-scrim-top)'

const PLAYER_BUTTON_OFF =
  'disabled:border-white/12 disabled:bg-white/3 disabled:text-(--pl-ink-3) disabled:hover:border-white/12 disabled:hover:bg-white/3 disabled:hover:text-(--pl-ink-3)'

export const PLAYER_BUTTON = cn(
  'tap-target rounded-full border border-white/25 bg-white/5 px-[calc(13rem/16)] py-[calc(5rem/16)] text-note font-bold whitespace-nowrap text-(--pl-ink-2) transition-[translate,background-color,color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px focus-visible:shadow-ring focus-visible:outline-none',
  PLAYER_BUTTON_OFF,
  pressable,
  still,
)

export const PLAYER_GLYPH_BUTTON = cn(
  'tap-target flex size-10 shrink-0 items-center justify-center rounded-md text-(--pl-ink) transition-[color,opacity] duration-150 ease-out',
  '[&_svg]:size-6 opacity-[.92] hover:opacity-100 hover:text-white',
  'focus-visible:shadow-ring focus-visible:outline-none',
  'disabled:text-(--pl-ink-3) disabled:opacity-60 disabled:hover:text-(--pl-ink-3)',
  pressable,
  still,
)

export const PLAYER_GLYPH_BUTTON_ON =
  'text-white opacity-100 before:absolute before:bottom-[calc(5rem/16)] before:h-[2px] before:w-[calc(18rem/16)] before:rounded-full before:bg-(--pl-accent) before:content-[""]'

export const PLAYER_BUTTON_ON =
  'border-(--pl-accent)/55 bg-(--pl-accent)/22 text-(--pl-accent-ink)'

/** The picture's column: the window's height less the bar above and the band below, and on a phone held on its side the window's height less only the bar above, which stays. */
export const PLAYER_COLUMN =
  'mx-auto w-full max-w-[calc((100svh_-_210px)*16/9)] sideways:max-w-[calc((100svh-62rem/16)*16/9)]'

export const PLAYER_BOARD = cn(
  PLAYER_COLUMN,
  'relative overflow-hidden rounded-xl border border-line-strong bg-(--pl-video) shadow-pop-xl outline-none',
  'data-[full]:flex data-[full]:max-w-none data-[full]:flex-col data-[full]:rounded-none data-[full]:border-0 data-[full]:shadow-none',
  'data-[fill]:fixed data-[fill]:inset-0 data-[fill]:z-[60] data-[fill]:m-0 data-[fill]:pt-[env(safe-area-inset-top)] data-[fill]:pr-[env(safe-area-inset-right)] data-[fill]:pb-[env(safe-area-inset-bottom)] data-[fill]:pl-[env(safe-area-inset-left)]',
)

export const PLAYER_FACE = 'aspect-video w-full'

export const PLAYER_PICTURE_BOX = 'size-full'

export const PLAYER_PICTURE = cn(PLAYER_PICTURE_BOX, 'object-contain')

/** The element over a caption that takes the pointer to move it: as large as the caption drawn, shown only while one is, and outlined faintly while it is held. */
export const CAPTION_GRIP = cn(
  'absolute hidden touch-none rounded-[calc(4rem/16)] data-[shown]:block',
  'data-[holding]:cursor-move data-[holding]:outline data-[holding]:outline-1 data-[holding]:outline-white/55',
)

/** A layer of the compact bar over the picture — the gear's company at the top, the sends in the middle: it takes no press of its own, and comes and goes with the bar. */
export const PLAYER_LAYER = cn(
  'pointer-events-none absolute z-10 opacity-0',
  PLAYER_CHROME_FADE,
  'data-[up]:opacity-100 has-[:focus-visible]:opacity-100',
)

/** What a compact layer holds that can be pressed: only while the bar is up. */
export const PLAYER_LAYER_HANDS = 'in-data-[up]:pointer-events-auto'

/** The sends in the middle of a compact picture: a glyph on a round of the picture's ink, larger than the bar's. */
export const PLAYER_SEND = cn(
  PLAYER_GLYPH_BUTTON,
  PLAYER_LAYER_HANDS,
  'size-11 rounded-full bg-black/45 [&_svg]:size-6',
)

/** The play and pause among the sends: the size of the mark that stands in the middle while the picture is stopped. */
export const PLAYER_SEND_MAIN = cn(
  PLAYER_SEND,
  'size-14 [&_svg]:size-[calc(30rem/16)]',
)
