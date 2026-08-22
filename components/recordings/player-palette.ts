import type { CSSProperties } from 'react'

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

export const PLAYER_BUTTON =
  'tap-target cursor-pointer rounded-full border border-white/25 bg-white/5 px-[13px] py-[5px] text-[11.5px] font-bold whitespace-nowrap text-(--pl-ink-2) transition-[translate,background-color,color] duration-150 ease-toy hover:bg-white/15 hover:text-(--pl-ink) hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-0 disabled:hover:bg-white/5'
