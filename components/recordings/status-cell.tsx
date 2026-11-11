import type { ReactNode } from 'react'

import type { StateTerm } from '@/lib/state-terms'

const WIDE_GLYPH = /[　-ヿ㐀-鿿豈-﫿＀-￯]/u

const WIDE_EM = 1

const NARROW_EM = 0.6

const SAY_FONT_PX = 12.5

const DOT_AND_GAP_PX = 12

const CELL_SIDES_PX = 26

const PILL_SIDES_PX = 22

const BASE_FONT_PX = 16

export type StateTone = 'ok' | 'warn' | 'err' | 'info' | 'mute'

function emOf(word: string): number {
  return [...word].reduce(
    (sum, glyph) => sum + (WIDE_GLYPH.test(glyph) ? WIDE_EM : NARROW_EM),
    0,
  )
}

export function stateColumnFor(words: readonly string[]): string {
  const longest = Math.max(...words.map(emOf))
  const px = Math.ceil(longest * SAY_FONT_PX + DOT_AND_GAP_PX + CELL_SIDES_PX)

  return `calc(${px}rem / ${BASE_FONT_PX})`
}

export function pillWidthFor(words: readonly string[]): string {
  const longest = Math.max(...words.map(emOf))
  const px = Math.ceil(longest * SAY_FONT_PX + PILL_SIDES_PX)

  return `calc(${px}rem / ${BASE_FONT_PX})`
}

/** The box InFull draws around a state: a pill around a chip, a line around a said state. */
export function tipBoxOf(say: boolean): string {
  return say ? 'inline-flex min-w-0' : 'inline-flex rounded-full'
}

export function toneOf(variant: string): StateTone {
  if (
    variant === 'ok' ||
    variant === 'warn' ||
    variant === 'err' ||
    variant === 'info'
  ) {
    return variant
  }

  return variant === 'sky' ? 'info' : 'mute'
}

export function StatusCell({ children }: { children: ReactNode }) {
  return (
    <span
      data-slot="status-cell"
      className="flex items-center justify-start text-left"
    >
      {children}
    </span>
  )
}

export function alsoSays(
  term: StateTerm,
  ...more: (string | undefined | false)[]
): StateTerm {
  const rest = more.filter((one): one is string => Boolean(one))

  if (rest.length === 0) {
    return term
  }

  return {
    label: term.label,
    explanation: [term.explanation, ...rest].join('\n'),
  }
}
