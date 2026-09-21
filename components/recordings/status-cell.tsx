import type { ReactNode } from 'react'

import type { StateTerm } from '@/lib/state-terms'
import type { PillWidth } from '@/components/ui/badge'

const WIDE_GLYPH = /[　-ヿ㐀-鿿豈-﫿＀-￯]/u

const WIDE_EM = 1

const NARROW_EM = 0.6

const DOT_AND_PADDING_EM = 3.25

const STEP_EM = 0.25

const PILL_FONT_PX = 11.5

export const STATE_COLUMN = 'w-[156px]'

function emOf(word: string): number {
  return [...word].reduce(
    (sum, glyph) => sum + (WIDE_GLYPH.test(glyph) ? WIDE_EM : NARROW_EM),
    0,
  )
}

export function pillWidthFor(words: readonly string[]): PillWidth {
  const longest = Math.max(...words.map(emOf))
  const width = Math.ceil((longest + DOT_AND_PADDING_EM) / STEP_EM) * STEP_EM

  return `${width}em`
}

export function stateColumnPx(width: PillWidth, cellSidesPx: number): number {
  return Math.ceil(parseFloat(width) * PILL_FONT_PX + cellSidesPx)
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
