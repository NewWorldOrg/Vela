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

export const PLAYER_SCRIM =
  'linear-gradient(to top, rgba(6,5,9,.92) 0%, rgba(6,5,9,.82) 34%, rgba(6,5,9,.58) 58%, rgba(6,5,9,.24) 80%, rgba(6,5,9,0) 100%)'

export const PLAYER_CHROME_FADE =
  'transition-[opacity,translate] duration-100 ease-[cubic-bezier(.4,0,1,1)] data-[up]:duration-[250ms] data-[up]:ease-[cubic-bezier(0,0,.2,1)]'

export const PLAYER_SCRIM_TOP =
  'linear-gradient(to bottom, rgba(6,5,9,.78) 0%, rgba(6,5,9,.42) 52%, rgba(6,5,9,0) 100%)'

const PLAYER_BUTTON_OFF =
  'disabled:border-white/12 disabled:bg-white/3 disabled:text-(--pl-ink-3) disabled:hover:border-white/12 disabled:hover:bg-white/3 disabled:hover:text-(--pl-ink-3)'

export const PLAYER_BUTTON = cn(
  'tap-target rounded-full border border-white/25 bg-white/5 px-[13px] py-[5px] text-[11.5px] font-bold whitespace-nowrap text-(--pl-ink-2) transition-[translate,background-color,color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px focus-visible:shadow-ring focus-visible:outline-none',
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
  'text-white opacity-100 before:absolute before:bottom-[5px] before:h-[2px] before:w-[18px] before:rounded-full before:bg-(--pl-accent) before:content-[""]'

export const PLAYER_BUTTON_ON =
  'border-[rgba(150,187,180,.55)] bg-[rgba(150,187,180,.22)] text-[#C0D8D3]'

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
