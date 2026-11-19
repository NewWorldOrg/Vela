import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'

export const PLAYER_SCRIM = 'var(--pl-scrim)'

export const PLAYER_CHROME_FADE =
  'transition-[opacity,translate] duration-100 ease-[cubic-bezier(.4,0,1,1)] data-[up]:duration-[250ms] data-[up]:ease-[cubic-bezier(0,0,.2,1)]'

export const PLAYER_CHROME_OVER = cn(
  'absolute inset-x-0 bottom-0 z-10',
  '[[data-fill]_&]:right-[env(safe-area-inset-right)] [[data-fill]_&]:bottom-[env(safe-area-inset-bottom)] [[data-fill]_&]:left-[env(safe-area-inset-left)]',
  'pointer-events-none translate-y-2 opacity-0',
  PLAYER_CHROME_FADE,
  'data-[up]:pointer-events-auto data-[up]:translate-y-0 data-[up]:opacity-100',
  'has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:translate-y-0 has-[:focus-visible]:opacity-100',
)

export const PLAYER_CHROME_UNDER = 'relative z-10 bg-(--pl-bg)'

export const PLAYER_BREAK_BAND = 'var(--pl-break-band)'

export const PLAYER_THEME_BAND = 'var(--pl-theme-band)'

export const PLAYER_SCRIM_TOP = 'var(--pl-scrim-top)'

const PLAYER_BUTTON_OFF =
  'disabled:border-white/12 disabled:bg-white/3 disabled:text-(--pl-ink-3) disabled:hover:border-white/12 disabled:hover:bg-white/3 disabled:hover:text-(--pl-ink-3)'

export const PLAYER_BUTTON = cn(
  'tap-target rounded-full border border-white/25 bg-white/5 px-[calc(13rem/16)] py-[calc(5rem/16)] text-note font-bold whitespace-nowrap text-(--pl-ink-2) transition-[translate,background-color,color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) focus-visible:shadow-ring focus-visible:outline-none',
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

export const PLAYER_COLUMN =
  'mx-auto w-full max-w-[calc((100svh_-_210px)*16/9)] sideways:max-w-[calc(100dvh*16/9)] upright:max-w-none'

export const PLAYER_KEPT_AT_THE_TOP =
  'upright:sticky upright:top-0 upright:z-20 upright:bg-(--pl-video) upright:pt-[env(safe-area-inset-top)] upright:has-[[data-slot=player-dock]:not([hidden])]:static upright:has-[[data-slot=player-dock]:not([hidden])]:bg-transparent'

export const PLAYER_ROW_ON_ITS_SIDE =
  'sideways:flex sideways:h-dvh sideways:flex-row sideways:items-center sideways:bg-(--pl-video) sideways:pl-[env(safe-area-inset-left)]'

export const PLAYER_BOARD = cn(
  PLAYER_COLUMN,
  'relative overflow-hidden rounded-[calc(18rem/16)] bg-(--pl-video) outline-none',
  'upright:rounded-none',
  'sideways:rounded-none',
  'data-[full]:flex data-[full]:max-w-none data-[full]:flex-col data-[full]:rounded-none',
  'data-[fill]:fixed data-[fill]:inset-0 data-[fill]:z-[60] data-[fill]:m-0 data-[fill]:pt-[env(safe-area-inset-top)] data-[fill]:pr-[env(safe-area-inset-right)] data-[fill]:pb-[env(safe-area-inset-bottom)] data-[fill]:pl-[env(safe-area-inset-left)]',
)

export const PLAYER_FACE = 'aspect-video w-full'

export const PLAYER_PICTURE_BOX = 'size-full'

export const PLAYER_PICTURE = cn(PLAYER_PICTURE_BOX, 'object-contain')

export const CAPTION_GRIP = cn(
  'absolute hidden touch-none rounded-[calc(4rem/16)] data-[shown]:block',
  'data-[holding]:cursor-move data-[holding]:outline data-[holding]:outline-1 data-[holding]:outline-white/55',
)

export const PLAYER_LAYER = cn(
  'pointer-events-none absolute z-10 opacity-0',
  PLAYER_CHROME_FADE,
  'data-[up]:opacity-100 has-[:focus-visible]:opacity-100',
)

export const PLAYER_LAYER_HANDS = 'in-data-[up]:pointer-events-auto'

export const PLAYER_SEND = cn(
  PLAYER_GLYPH_BUTTON,
  PLAYER_LAYER_HANDS,
  'size-11 rounded-full bg-black/45 [&_svg]:size-6',
)

export const PLAYER_SEND_MAIN = cn(
  PLAYER_SEND,
  'size-14 [&_svg]:size-[calc(30rem/16)]',
)
