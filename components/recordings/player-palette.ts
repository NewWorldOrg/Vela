import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'

export const PLAYER_SCRIM = 'var(--pl-scrim)'

export const PLAYER_CHROME_FADE =
  'transition-[opacity,translate] duration-100 ease-[cubic-bezier(.4,0,1,1)] data-[up]:duration-[250ms] data-[up]:ease-[cubic-bezier(0,0,.2,1)]'

export const PLAYER_BREAK_BAND = 'var(--pl-break-band)'

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

export const PLAYER_COLUMN =
  'mx-auto w-full max-w-[calc((100dvh_-_210px)*16/9)]'

export const PLAYER_BOARD = cn(
  PLAYER_COLUMN,
  'relative overflow-hidden rounded-xl border border-line-strong bg-(--pl-video) shadow-pop-xl outline-none',
  '[&:fullscreen]:flex [&:fullscreen]:max-w-none [&:fullscreen]:flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:shadow-none',
)

export const PLAYER_FACE = 'aspect-video w-full'

export const PLAYER_PICTURE_BOX = 'size-full'

export const PLAYER_PICTURE = cn(PLAYER_PICTURE_BOX, 'object-contain')
